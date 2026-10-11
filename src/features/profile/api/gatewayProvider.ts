import type { ProfileGateway } from './profile.gateway';
import { createFakeProfileGateway } from './fakeProfileGateway';

export const profileGateway: ProfileGateway = createFakeProfileGateway({
  scenario: 'student',
});
