import client from './client';
import type { Vocabulary, PaginatedResponse, Tag } from '@/types';

export const vocabApi = {
  list(params?: { page?: number; page_size?: number; tag_id?: string; search?: string }) {
    return client.get<PaginatedResponse<Vocabulary>>('/vocabularies', { params });
  },
  create(data: { word: string; translation: string; source_language?: string; target_language?: string; definition?: string; example_sentence?: string; pronunciation?: string; difficulty_level?: number; tag_ids?: string[] }) {
    return client.post<Vocabulary>('/vocabularies', data);
  },
  update(id: string, data: Partial<{ word: string; translation: string; definition: string; example_sentence: string; pronunciation: string; difficulty_level: number; tag_ids: string[] }>) {
    return client.put<Vocabulary>(`/vocabularies/${id}`, data);
  },
  delete(id: string) {
    return client.delete(`/vocabularies/${id}`);
  },
  batchCreate(words: { word: string; translation: string; source_language?: string; target_language?: string; definition?: string }[]) {
    return client.post<Vocabulary[]>('/vocabularies/batch', { words });
  },
};

export const tagApi = {
  list() {
    return client.get<Tag[]>('/tags');
  },
  create(data: { name: string; color?: string }) {
    return client.post<Tag>('/tags', data);
  },
  update(id: string, data: { name: string; color?: string }) {
    return client.put<Tag>(`/tags/${id}`, data);
  },
  delete(id: string) {
    return client.delete(`/tags/${id}`);
  },
};
