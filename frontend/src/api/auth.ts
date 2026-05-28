import client from './client';
import type { TokenResponse } from '@/types';

export const authApi = {
  register(data: { email: string; username: string; password: string; display_name?: string }) {
    return client.post<TokenResponse>('/auth/register', data);
  },
  login(data: { email: string; password: string }) {
    return client.post<TokenResponse>('/auth/login', data);
  },
  refresh(refresh_token: string) {
    return client.post<TokenResponse>('/auth/refresh', { refresh_token });
  },
};
