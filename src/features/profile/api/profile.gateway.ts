import { Profile } from './profile.types';

export interface ProfileGateway {
  getProfile(): Promise<Profile>;
}
