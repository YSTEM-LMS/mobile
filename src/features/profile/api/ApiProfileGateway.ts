import type { ProfileGateway } from './profile.gateway';
import type { ApiClientInterface } from '@/types/apiClient.types';
import { parseProfile } from './profile.mapper';
import { ProfileError } from './profile.errors';
import { AppError } from '@/services/api/apiError';

export function createApiProfileGateway(
  client: ApiClientInterface,
): ProfileGateway {
  return {
    async getProfile(username, options) {
      let raw: unknown;
      try {
        raw = await client.get<unknown>(
          `/user/getUser?username=${encodeURIComponent(username)}`,
          { signal: options?.signal },
        );
      } catch (error) {
        if (error instanceof AppError) {
          if (error.code === 'REQUEST_CANCEL') throw error;
          if (error.code === 'SESSION_EXPIRED') 
            throw new ProfileError('session-expired', error.message);
          if (error.code === 'INVALID_RESPONSE') 
            throw new ProfileError('invalid-data', error.message);
        }
        throw new ProfileError('network', 'Could not load your profile.');
      }
      return parseProfile(raw);
    },
  };
}
