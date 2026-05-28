import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { progressApi } from '@/api/progress';
import { exerciseApi } from '@/api/exercises';
import type { ProgressSummary, DailyProgress, Exercise } from '@/types';

export default function ProgressPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    progressApi.summary().then((r) => setSummary(r.data));
    progressApi.history(30).then((r) => setHistory(r.data));
    exerciseApi.history({ page: 1, page_size: 10 }).then((r) => setExercises(r.data.items));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('progress.title')}</h1>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label={t('progress.totalWords')} value={summary.total_words} />
          <StatCard label={t('progress.mastered')} value={summary.words_mastered} />
          <StatCard label={t('progress.exercises')} value={summary.total_exercises} />
          <StatCard label={t('progress.avgScore')} value={summary.average_score ? `${summary.average_score}%` : '-'} />
          <StatCard label={t('progress.streak')} value={summary.current_streak} />
          <StatCard label={t('progress.dueReview')} value={summary.words_due_review} />
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('progress.history')}</h2>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="words_reviewed" stroke="#22c55e" name="Words Reviewed" />
              <Line type="monotone" dataKey="exercises_completed" stroke="#6366f1" name="Exercises" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('progress.noData')}</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">{t('progress.exerciseHistory')}</h2>
        {exercises.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('progress.noData')}</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Score</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Questions</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exercises.map((ex) => (
                <tr key={ex.id}>
                  <td className="px-4 py-2 capitalize">{ex.exercise_type.replace('_', ' ')}</td>
                  <td className="px-4 py-2 font-medium text-primary-600">{ex.score?.toFixed(0)}%</td>
                  <td className="px-4 py-2">{ex.correct_answers}/{ex.total_questions}</td>
                  <td className="px-4 py-2 text-gray-500 text-sm">{ex.completed_at ? new Date(ex.completed_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-primary-600">{value}</div>
    </div>
  );
}
