import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exerciseApi } from '@/api/exercises';
import type { Exercise } from '@/types';

export default function ExerciseSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string | number } | null>(null);
  const [matchState, setMatchState] = useState<{ selected: number | null; pairs: Record<number, number> }>({ selected: null, pairs: {} });
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (id) exerciseApi.get(id).then((r) => setExercise(r.data));
  }, [id]);

  if (!exercise) return <div className="text-center py-12">{t('common.loading')}</div>;
  if (exercise.completed) return <ResultView exercise={exercise} />;

  const questions = exercise.questions;
  const currentQ = questions[currentIdx];
  const isCardMatching = exercise.exercise_type === 'card_matching';

  const handleSubmitAnswer = async (ans: string) => {
    const { data } = await exerciseApi.answer(exercise.id, { question_id: currentQ.id, answer: ans });
    setFeedback({ correct: data.is_correct, answer: data.correct_answer });
  };

  const handleNext = async () => {
    setFeedback(null);
    setAnswer('');
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const { data } = await exerciseApi.complete(exercise.id, { duration_seconds: duration });
      setExercise(data);
    }
  };

  const handleMatchSubmit = async () => {
    const ans = JSON.stringify(matchState.pairs);
    await exerciseApi.answer(exercise.id, { question_id: currentQ.id, answer: ans });
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    const { data } = await exerciseApi.complete(exercise.id, { duration_seconds: duration });
    setExercise(data);
  };

  if (isCardMatching) {
    const qd = currentQ.question_data;
    const leftCards = qd.left_cards || [];
    const rightCards = qd.right_cards || [];
    const allPaired = Object.keys(matchState.pairs).length === leftCards.length;

    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-6">{t('exercise.matchPairs')}</h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3">
            {leftCards.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  if (matchState.pairs[i] !== undefined) return;
                  setMatchState({ ...matchState, selected: i });
                }}
                className={`w-full p-3 rounded-lg border-2 text-left transition ${
                  matchState.selected === i ? 'border-primary-500 bg-primary-50' : matchState.pairs[i] !== undefined ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {card}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {rightCards.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  if (matchState.selected === null) return;
                  if (Object.values(matchState.pairs).includes(i)) return;
                  setMatchState({
                    selected: null,
                    pairs: { ...matchState.pairs, [matchState.selected]: i },
                  });
                }}
                className={`w-full p-3 rounded-lg border-2 text-left transition ${
                  Object.values(matchState.pairs).includes(i) ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {card}
              </button>
            ))}
          </div>
        </div>
        {allPaired && (
          <button onClick={handleMatchSubmit} className="mt-6 w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition">
            {t('exercise.submit')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{t('exercise.question', { current: currentIdx + 1, total: questions.length })}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200">
        <p className="text-lg text-gray-500 mb-2">{t('vocab.translation')}:</p>
        <p className="text-2xl font-bold mb-6">{currentQ.question_data.prompt}</p>

        {currentQ.question_data.hint && !feedback && (
          <p className="text-sm text-gray-400 mb-4">{t('exercise.hint', { hint: currentQ.question_data.hint })}</p>
        )}

        {exercise.exercise_type === 'spelling' && (
          <div>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !feedback) handleSubmitAnswer(answer); }}
              disabled={!!feedback}
              placeholder={t('exercise.typeAnswer')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg outline-none focus:border-primary-500"
              autoFocus
            />
          </div>
        )}

        {exercise.exercise_type === 'multiple_choice' && (
          <div className="space-y-3">
            {currentQ.question_data.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => { if (!feedback) handleSubmitAnswer(String(i)); }}
                disabled={!!feedback}
                className={`w-full p-4 rounded-xl border-2 text-left transition ${
                  feedback
                    ? i === currentQ.question_data.correct_index
                      ? 'border-green-500 bg-green-50'
                      : feedback.answer !== undefined && String(i) === String(feedback.answer) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {feedback && (
          <div className={`mt-4 p-4 rounded-xl ${feedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-medium">{feedback.correct ? t('exercise.correct') : t('exercise.incorrect')}</p>
            {!feedback.correct && <p className="text-sm mt-1">{t('exercise.correctAnswer', { answer: String(feedback.answer) })}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!feedback && exercise.exercise_type === 'spelling' && (
            <button onClick={() => handleSubmitAnswer(answer)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
              {t('exercise.submit')}
            </button>
          )}
          {feedback && (
            <button onClick={handleNext} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
              {t('exercise.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-white p-8 rounded-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">{t('exercise.results')}</h2>
        <div className="text-5xl font-bold text-primary-600 mb-2">
          {t('exercise.score', { score: exercise.score?.toFixed(0) || 0 })}
        </div>
        <p className="text-gray-500 mb-6">
          {exercise.correct_answers} / {exercise.total_questions} correct
          {exercise.duration_seconds && ` • ${t('exercise.timeSpent', { time: exercise.duration_seconds })}`}
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/exercises')} className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            {t('exercise.backToExercises')}
          </button>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            {t('exercise.tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
