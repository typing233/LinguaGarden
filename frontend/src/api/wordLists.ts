import client from './client';
import type { WordList, WordListDetail } from '@/types';

export const wordListApi = {
  list() {
    return client.get<WordList[]>('/word-lists');
  },
  create(data: { name: string; description?: string }) {
    return client.post<WordList>('/word-lists', data);
  },
  get(id: string) {
    return client.get<WordListDetail>(`/word-lists/${id}`);
  },
  update(id: string, data: { name?: string; description?: string }) {
    return client.put<WordList>(`/word-lists/${id}`, data);
  },
  delete(id: string) {
    return client.delete(`/word-lists/${id}`);
  },
  addWords(id: string, vocabulary_ids: string[]) {
    return client.post(`/word-lists/${id}/words`, { vocabulary_ids });
  },
  removeWord(listId: string, vocabId: string) {
    return client.delete(`/word-lists/${listId}/words/${vocabId}`);
  },
};
