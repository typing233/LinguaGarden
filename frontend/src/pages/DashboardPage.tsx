import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { progressApi } from '@/api/progress';
import type { ProgressSummary } from '@/types';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    progressApi.summary().then((r) => setSummary(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {t('dashboard.welcome', { name: user?.display_name || user?.username })}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('dashboard.totalWords')} value={summary?.total_words ?? 0} />
        <StatCard label={t('dashboard.mastered')} value={summary?.words_mastered ?? 0} />
        <StatCard label={t('dashboard.streak')} value={summary?.current_streak ?? 0} />
        <StatCard label={t('dashboard.dueReview')} value={summary?.words_due_review ?? 0} />
      </div>

      <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/exercises" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow transition text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="font-medium">{t('dashboard.startExercise')}</div>
        </Link>
        <Link to="/vocabulary" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow transition text-center">
          <div className="text-3xl mb-2">📚</div>
          <div className="font-medium">{t('dashboard.addWords')}</div>
        </Link>
        <Link to="/garden" className="p-6 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow transition text-center">
          <div className="text-3xl mb-2">🌱</div>
          <div className="font-medium">{t('dashboard.uploadImage')}</div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-primary-600">{value}</div>
    </div>
  );
}
