import client from './client';
import type { ProgressSummary, DailyProgress } from '@/types';

export const progressApi = {
  summary() {
    return client.get<ProgressSummary>('/progress/summary');
  },
  history(days?: number) {
    return client.get<DailyProgress[]>('/progress/history', { params: { days } });
  },
};
