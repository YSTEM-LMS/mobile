import type { ProfileGateway } from './profile.gateway';
import { apiClient } from '@/services/api/apiClient';
import { createApiProfileGateway } from './ApiProfileGateway';

const apiGateway = createApiProfileGateway(apiClient);

// For testing only
let override: ProfileGateway | null = null;
export function setProfileGatewayForTests(gateway: ProfileGateway | null) {
  override = gateway;
}

export const profileGateway: ProfileGateway = {
  getProfile: (username, options) => (override ?? apiGateway).getProfile(username, options),
};
