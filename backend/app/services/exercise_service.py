import random
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

    # Prioritize low-mastery words
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
        _generate_spelling(db, exercise, selected)
    elif exercise_type == "multiple_choice":
        _generate_multiple_choice(db, exercise, selected, all_vocab)
    elif exercise_type == "card_matching":
        _generate_card_matching(db, exercise, selected)

    db.commit()
    db.refresh(exercise)
    return exercise


def _generate_spelling(db: Session, exercise: Exercise, words: list[Vocabulary]):
    for vocab in words:
        hint = _make_hint(vocab.word)
        question = ExerciseQuestion(
            exercise_id=exercise.id,
            vocabulary_id=vocab.id,
            question_data={
                "type": "spelling",
                "prompt": vocab.translation,
                "hint": hint,
                "correct_answer": vocab.word,
            },
        )
        db.add(question)


def _generate_multiple_choice(db: Session, exercise: Exercise, words: list[Vocabulary], all_vocab: list[Vocabulary]):
    for vocab in words:
        distractors = [v for v in all_vocab if v.id != vocab.id]
        random.shuffle(distractors)
        options_vocab = distractors[:3]
        options = [v.word for v in options_vocab] + [vocab.word]
        random.shuffle(options)
        correct_index = options.index(vocab.word)

        question = ExerciseQuestion(
            exercise_id=exercise.id,
            vocabulary_id=vocab.id,
            question_data={
                "type": "multiple_choice",
                "prompt": vocab.translation,
                "options": options,
                "correct_index": correct_index,
            },
        )
        db.add(question)


def _generate_card_matching(db: Session, exercise: Exercise, words: list[Vocabulary]):
    selected = words[:min(8, len(words))]
    exercise.total_questions = len(selected)

    left_cards = [v.word for v in selected]
    right_cards = [v.translation for v in selected]
    right_indices = list(range(len(selected)))
    random.shuffle(right_indices)
    shuffled_right = [right_cards[i] for i in right_indices]

    correct_pairs = {}
    for i, ri in enumerate(right_indices):
        correct_pairs[str(i)] = ri

    # Store as a single question for card matching
    question = ExerciseQuestion(
        exercise_id=exercise.id,
        vocabulary_id=selected[0].id,
        question_data={
            "type": "card_matching",
            "left_cards": left_cards,
            "right_cards": shuffled_right,
            "correct_pairs": correct_pairs,
        },
    )
    db.add(question)


def check_answer(db: Session, question: ExerciseQuestion, answer: str) -> bool:
    qdata = question.question_data
    exercise_type = qdata["type"]

    if exercise_type == "spelling":
        correct = qdata["correct_answer"].lower().strip()
        user_ans = answer.lower().strip()
        is_correct = correct == user_ans or _levenshtein(correct, user_ans) <= 1
    elif exercise_type == "multiple_choice":
        try:
            is_correct = int(answer) == qdata["correct_index"]
        except (ValueError, TypeError):
            is_correct = False
    elif exercise_type == "card_matching":
        try:
            import json
            user_pairs = json.loads(answer) if isinstance(answer, str) else answer
            correct_pairs = qdata["correct_pairs"]
            correct_count = sum(1 for k, v in user_pairs.items() if correct_pairs.get(k) == v)
            total = len(correct_pairs)
            is_correct = correct_count == total
        except (json.JSONDecodeError, AttributeError):
            is_correct = False
    else:
        is_correct = False

    question.user_answer = answer
    question.is_correct = is_correct
    question.answered_at = datetime.now(timezone.utc)
    db.commit()
    return is_correct


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
