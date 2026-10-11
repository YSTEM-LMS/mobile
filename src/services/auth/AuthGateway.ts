// Temporary AppError import until API is merged
import { AppError, tokenStore } from '../storage/TokenStore';
import { AuthGateway, LoginResponse } from '@/types/authGateway';

export const studentToken =
  'eyJ0eXAiOiJKV1QifQ.eyJ1c2VybmFtZSI6Im1vY2stc3R1ZGVudCIsImZpcnN0TmFtZSI6Ik1vY2siLCJsYXN0TmFtZSI6IlN0dWRlbnQiLCJyb2xlIjoic3R1ZGVudCJ9.fake';

export const mentorToken =
  'eyJ0eXAiOiJKV1QifQ.eyJ1c2VybmFtZSI6Im1vY2stbWVudG9yIiwiZmlyc3ROYW1lIjoiTW9jayIsImxhc3ROYW1lIjoiTWVudG9yIiwicm9sZSI6Im1lbnRvciJ9.fake';

// Fake apiClient until Brandons API client is merged.
export const fakeApiClient = {
  async post<T, B = unknown>(
    endpoint: string,
    body: B,
    options?: { headers?: Record<string, string> },
  ): Promise<T | null> {
    if (!__DEV__) {
      throw new AppError('UNKNOWN', 'Sign in is unavailable.');
    }

    if (endpoint === '/auth/login') {
      const username = (body as { username?: string })?.username;
      if (username === 'student') return { token: studentToken } as T;
      if (username === 'mentor') return { token: mentorToken } as T;
      throw new AppError('UNKNOWN', 'Invalid username or password.');
    }

    if (endpoint === '/auth/validate') {
      const bearer = options?.headers?.Authorization;
      if (
        bearer === `Bearer ${studentToken}` ||
        bearer === `Bearer ${mentorToken}`
      ) {
        return null; // Successful 200 with no response body
      }
      throw new AppError('SESSION_EXPIRED', 'Your session has expired.', 401);
    }

    throw new AppError('UNKNOWN', 'Unsupported authentication request.');
  },
};

export function createAuthGateway(client: typeof fakeApiClient): AuthGateway {
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

export const authGateway = createAuthGateway(fakeApiClient);
