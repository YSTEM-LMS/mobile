import type { ProfileGateway } from './profile.gateway';
import { createFakeProfileGateway } from './fakeProfileGateway';

const defaultGateway: ProfileGateway = createFakeProfileGateway({
  scenario: 'student',
});

// For testing only
let override: ProfileGateway | null = null;
export function setProfileGatewayForTests(gateway: ProfileGateway | null) {
  override = gateway;
}

export const profileGateway: ProfileGateway = {
  getProfile: () => (override ?? defaultGateway).getProfile(),
};
