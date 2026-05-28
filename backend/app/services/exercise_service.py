import random
import json
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.vocabulary import Vocabulary
from app.models.exercise import Exercise, ExerciseQuestion
from app.models.word_list import WordList
from app.models.progress import Progress


def generate_exercise(
    db: Session,
    user_id: uuid.UUID,
    exercise_type: str,
    word_list_id: uuid.UUID | None,
    count: int,
    preferred_language: str = "en",
) -> Exercise:
    query = db.query(Vocabulary).filter(Vocabulary.user_id == user_id)
    if word_list_id:
        wl = db.query(WordList).filter(WordList.id == word_list_id, WordList.user_id == user_id).first()
        if wl:
            vocab_ids = [item.vocabulary_id for item in wl.items]
            query = query.filter(Vocabulary.id.in_(vocab_ids))

    all_vocab = query.all()
    if len(all_vocab) < 4:
        raise ValueError("Need at least 4 vocabulary words to generate exercises")

    all_vocab.sort(key=lambda v: (v.mastery_level, random.random()))
    selected = all_vocab[:count]

    exercise = Exercise(
        user_id=user_id,
        exercise_type=exercise_type,
        word_list_id=word_list_id,
        total_questions=len(selected),
    )
    db.add(exercise)
    db.flush()

    if exercise_type == "spelling":
        _generate_spelling(db, exercise, selected, preferred_language)
    elif exercise_type == "multiple_choice":
        _generate_multiple_choice(db, exercise, selected, all_vocab, preferred_language)
    elif exercise_type == "card_matching":
        _generate_card_matching(db, exercise, selected, preferred_language)

    db.commit()
    db.refresh(exercise)
    return exercise


def _get_prompt_and_answer(vocab: Vocabulary, preferred_language: str) -> tuple[str, str, str, str]:
    """Determine question direction based on user's preferred language.
    Returns (prompt_text, expected_answer, prompt_language, answer_language).

    If user's preferred language matches source_language (e.g. user knows English,
    source=en, target=zh): show Chinese translation as prompt, expect English word.

    If user's preferred language matches target_language (e.g. user knows Chinese,
    source=en, target=zh): show English word as prompt, expect Chinese translation.
    """
    if preferred_language == vocab.source_language:
        # User knows source language → show target (translation) as prompt, expect source (word)
        return vocab.translation, vocab.word, vocab.target_language, vocab.source_language
    else:
        # User knows target language → show source (word) as prompt, expect target (translation)
        return vocab.word, vocab.translation, vocab.source_language, vocab.target_language


def _generate_spelling(db: Session, exercise: Exercise, words: list[Vocabulary], preferred_language: str):
    for vocab in words:
        prompt, answer, prompt_lang, answer_lang = _get_prompt_and_answer(vocab, preferred_language)
        hint = _make_hint(answer)
        question = ExerciseQuestion(
            exercise_id=exercise.id,
            vocabulary_id=vocab.id,
            question_data={
                "type": "spelling",
                "prompt": prompt,
                "hint": hint,
                "correct_answer": answer,
                "prompt_language": prompt_lang,
                "answer_language": answer_lang,
            },
        )
        db.add(question)


def _generate_multiple_choice(db: Session, exercise: Exercise, words: list[Vocabulary], all_vocab: list[Vocabulary], preferred_language: str):
    for vocab in words:
        prompt, correct_answer, prompt_lang, answer_lang = _get_prompt_and_answer(vocab, preferred_language)
        # Distractors come from the same "answer side"
        use_word_field = (answer_lang == vocab.source_language)

        distractors = [v for v in all_vocab if v.id != vocab.id]
        random.shuffle(distractors)
        distractor_texts = [v.word if use_word_field else v.translation for v in distractors[:3]]
        options = distractor_texts + [correct_answer]
        random.shuffle(options)
        correct_index = options.index(correct_answer)

        question = ExerciseQuestion(
            exercise_id=exercise.id,
            vocabulary_id=vocab.id,
            question_data={
                "type": "multiple_choice",
                "prompt": prompt,
                "options": options,
                "correct_index": correct_index,
                "correct_answer": correct_answer,
                "prompt_language": prompt_lang,
                "answer_language": answer_lang,
            },
        )
        db.add(question)


def _generate_card_matching(db: Session, exercise: Exercise, words: list[Vocabulary], preferred_language: str):
    selected = words[:min(8, len(words))]
    exercise.total_questions = len(selected)

    # Left cards = prompt side, Right cards = answer side (based on language)
    if selected[0].source_language == preferred_language:
        # User knows source → show target on left, source on right
        left_cards = [v.translation for v in selected]
        right_cards = [v.word for v in selected]
        prompt_lang = selected[0].target_language
        answer_lang = selected[0].source_language
    else:
        # User knows target → show source on left, target on right
        left_cards = [v.word for v in selected]
        right_cards = [v.translation for v in selected]
        prompt_lang = selected[0].source_language
        answer_lang = selected[0].target_language

    # Shuffle right side
    right_indices = list(range(len(selected)))
    random.shuffle(right_indices)
    shuffled_right = [right_cards[i] for i in right_indices]

    # Build correct_pairs: left index i matches shuffled right position
    inverse_map = {original_idx: shuffled_pos for shuffled_pos, original_idx in enumerate(right_indices)}
    correct_pairs = {str(i): inverse_map[i] for i in range(len(selected))}

    for i, vocab in enumerate(selected):
        question = ExerciseQuestion(
            exercise_id=exercise.id,
            vocabulary_id=vocab.id,
            question_data={
                "type": "card_matching",
                "left_cards": left_cards,
                "right_cards": shuffled_right,
                "correct_pairs": correct_pairs,
                "my_left_index": i,
                "my_correct_right_index": correct_pairs[str(i)],
                "prompt_language": prompt_lang,
                "answer_language": answer_lang,
            },
        )
        db.add(question)


def check_answer(db: Session, question: ExerciseQuestion, answer: str) -> dict:
    """Returns detailed result dict for the answer."""
    qdata = question.question_data
    exercise_type = qdata["type"]

    if exercise_type == "spelling":
        correct = qdata["correct_answer"].lower().strip()
        user_ans = answer.lower().strip()
        is_correct = correct == user_ans or (len(correct) > 4 and _levenshtein(correct, user_ans) <= 1)
        result = {"is_correct": is_correct, "correct_answer": qdata["correct_answer"]}

    elif exercise_type == "multiple_choice":
        try:
            is_correct = int(answer) == qdata["correct_index"]
        except (ValueError, TypeError):
            is_correct = False
        result = {"is_correct": is_correct, "correct_answer": qdata["correct_answer"]}

    elif exercise_type == "card_matching":
        # answer is JSON: user's full pair mapping {"0": 2, "1": 0, ...}
        try:
            user_pairs = json.loads(answer) if isinstance(answer, str) else answer
            my_idx = str(qdata["my_left_index"])
            user_choice = user_pairs.get(my_idx)
            is_correct = user_choice == qdata["my_correct_right_index"]
        except (json.JSONDecodeError, AttributeError, TypeError):
            is_correct = False
        result = {"is_correct": is_correct, "correct_answer": qdata["my_correct_right_index"]}
    else:
        is_correct = False
        result = {"is_correct": False, "correct_answer": None}

    question.user_answer = answer
    question.is_correct = is_correct
    question.answered_at = datetime.now(timezone.utc)
    db.commit()
    return result


def check_card_matching_batch(db: Session, exercise: Exercise, user_pairs_json: str) -> dict:
    """Check all card matching questions at once. Returns per-pair results."""
    try:
        user_pairs = json.loads(user_pairs_json)
    except (json.JSONDecodeError, TypeError):
        user_pairs = {}

    correct_count = 0
    total = 0
    for question in exercise.questions:
        if question.question_data.get("type") != "card_matching":
            continue
        total += 1
        my_idx = str(question.question_data["my_left_index"])
        user_choice = user_pairs.get(my_idx)
        is_correct = user_choice == question.question_data["my_correct_right_index"]
        question.user_answer = user_pairs_json
        question.is_correct = is_correct
        question.answered_at = datetime.now(timezone.utc)
        if is_correct:
            correct_count += 1
    db.commit()
    return {"correct_count": correct_count, "total": total}


def complete_exercise(db: Session, exercise: Exercise, duration_seconds: int | None = None):
    correct = sum(1 for q in exercise.questions if q.is_correct)
    exercise.correct_answers = correct
    exercise.score = (correct / exercise.total_questions * 100) if exercise.total_questions > 0 else 0
    exercise.completed = True
    exercise.completed_at = datetime.now(timezone.utc)
    if duration_seconds:
        exercise.duration_seconds = duration_seconds
    db.commit()

    _update_progress(db, exercise)


def _update_progress(db: Session, exercise: Exercise):
    for question in exercise.questions:
        if question.is_correct is None:
            continue
        progress = db.query(Progress).filter(
            Progress.user_id == exercise.user_id,
            Progress.vocabulary_id == question.vocabulary_id,
        ).first()
        if not progress:
            progress = Progress(user_id=exercise.user_id, vocabulary_id=question.vocabulary_id)
            db.add(progress)
            db.flush()

        # Ensure no None values from DB
        if progress.review_count is None:
            progress.review_count = 0
        if progress.correct_count is None:
            progress.correct_count = 0
        if progress.streak is None:
            progress.streak = 0

        progress.review_count += 1
        progress.last_reviewed_at = datetime.now(timezone.utc)

        if question.is_correct:
            progress.correct_count += 1
            progress.streak += 1
            vocab = db.query(Vocabulary).filter(Vocabulary.id == question.vocabulary_id).first()
            if vocab:
                vocab.mastery_level = min(100, vocab.mastery_level + 5)
            days_until_review = min(30, 1 * (2 ** progress.streak))
            progress.next_review_at = datetime.now(timezone.utc) + timedelta(days=days_until_review)
        else:
            progress.streak = 0
            vocab = db.query(Vocabulary).filter(Vocabulary.id == question.vocabulary_id).first()
            if vocab:
                vocab.mastery_level = max(0, vocab.mastery_level - 3)
            progress.next_review_at = datetime.now(timezone.utc) + timedelta(hours=4)

    db.commit()


def _make_hint(word: str) -> str:
    if len(word) <= 2:
        return word[0] + " _"
    chars = list(word)
    indices_to_hide = random.sample(range(1, len(word) - 1), min(len(word) // 2, len(word) - 2))
    for i in indices_to_hide:
        chars[i] = "_"
    return " ".join(chars)


def _levenshtein(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    return prev_row[-1]
