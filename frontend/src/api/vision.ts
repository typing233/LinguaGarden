import client from './client';
import type { ImageResult } from '@/types';

export const visionApi = {
  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<ImageResult>('/vision/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listImages() {
    return client.get<ImageResult[]>('/vision/images');
  },
  getImage(id: string) {
    return client.get<ImageResult>(`/vision/images/${id}`);
  },
  addWords(imageId: string, word_indices: number[]) {
    return client.post(`/vision/images/${imageId}/add-words`, { word_indices });
  },
};
