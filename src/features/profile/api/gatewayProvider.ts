import type { ProfileGateway } from './profile.gateway';
import { createApiClient, REQUEST_TIMEOUT_MS } from '@/services/api/apiClient';
import { createApiProfileGateway } from './ApiProfileGateway';
import { tokenStore } from '@/services/storage/TokenStore';
import { env } from '@/config/env';

const client = createApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: REQUEST_TIMEOUT_MS,
  tokenProvider: () => tokenStore.getToken(),
});

const apiGateway = createApiProfileGateway(client);

// For testing only
let override: ProfileGateway | null = null;
export function setProfileGatewayForTests(gateway: ProfileGateway | null) {
  override = gateway;
}

export const profileGateway: ProfileGateway = {
  getProfile: (username, options) =>
    (override ?? apiGateway).getProfile(username, options),
};
