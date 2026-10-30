import type { ProfileGateway } from './profile.gateway';

export function createApiProfileGateway(): ProfileGateway {
  return {
    async getProfile() {
      throw new Error('ApiProfileGateway is not connected yet');
    },
  };
}
