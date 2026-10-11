import { apiClient } from '@/services/api/apiClient';
import { AppError } from '@/services/api/apiError';
import type { ApiClientInterface } from '@/types/apiClient.types';
import { tokenStore } from '../storage/TokenStore';
import { AuthGateway, LoginResponse } from '@/types/authGateway';



export function createAuthGateway(client: ApiClientInterface): AuthGateway {
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
        if(error instanceof AppError) {
          throw error;
        }

        throw new AppError('UNKNOWN', 'Sign out failed. Please try again.');
      }
    },

    async validate(token) {
      try {
        await client.post<unknown, undefined>('/auth/validate', undefined, {
          headers: { Authorization: `Bearer ${token}` },
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
