import { tokenStore } from '../storage/TokenStore';
import { AppError } from '../api/apiError';
import { apiClient } from '../api/apiClient';
import { AuthGateway, LoginResponse } from '@/types/authGateway';

export const studentToken =
  'eyJ0eXAiOiJKV1QifQ.eyJ1c2VybmFtZSI6Im1vY2stc3R1ZGVudCIsImZpcnN0TmFtZSI6Ik1vY2siLCJsYXN0TmFtZSI6IlN0dWRlbnQiLCJyb2xlIjoic3R1ZGVudCJ9.fake';

export const mentorToken =
  'eyJ0eXAiOiJKV1QifQ.eyJ1c2VybmFtZSI6Im1vY2stbWVudG9yIiwiZmlyc3ROYW1lIjoiTW9jayIsImxhc3ROYW1lIjoiTWVudG9yIiwicm9sZSI6Im1lbnRvciJ9.fake';

export function createAuthGateway(client: typeof apiClient): AuthGateway {
  return {
    async login(username, password) {
      try {
        const response: LoginResponse | null = await client.post<LoginResponse>(
          '/auth/login',
          { username, password },
        );

        return response?.token ?? '';
      } catch (error) {
        throw error;
      }
    },

    async logout() {
      try {
        await tokenStore.deleteToken();
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        throw new AppError('UNKNOWN', 'Sign out failed. Please try again.');
      }
    },

    async validate(token) {
      try {
        await client.post('/auth/validate', undefined, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'text',
        });
        return true;
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === 'SESSION_EXPIRED' &&
          error.status === 401
        ) {
          return false;
        }
        throw error;
      }
    },
  };
}

export const authGateway = createAuthGateway(apiClient);
