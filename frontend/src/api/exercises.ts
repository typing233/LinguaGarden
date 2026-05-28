import client from './client';
import type { Exercise } from '@/types';

export const exerciseApi = {
  generate(data: { exercise_type: string; word_list_id?: string; count?: number }) {
    return client.post<Exercise>('/exercises/generate', data);
  },
  get(id: string) {
    return client.get<Exercise>(`/exercises/${id}`);
  },
  answer(exerciseId: string, data: { question_id: string; answer: string }) {
    return client.post<{ is_correct: boolean; correct_answer?: string | number; correct_count?: number; total?: number }>(`/exercises/${exerciseId}/answer`, data);
  },
  complete(id: string, data?: { duration_seconds?: number }) {
    return client.post<Exercise>(`/exercises/${id}/complete`, data || {});
  },
  history(params?: { page?: number; page_size?: number }) {
    return client.get<{ items: Exercise[]; total: number; page: number; page_size: number }>('/exercises', { params });
  },
};
