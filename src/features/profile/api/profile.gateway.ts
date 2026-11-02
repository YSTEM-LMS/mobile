import { Profile } from './profile.types';

export interface ProfileGateway {
  getProfile(
    username: string,
    options?: { signal?: AbortSignal },
  ): Promise<Profile>;
}
