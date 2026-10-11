import { ProfileError } from './profile.errors';
import { ProfileGateway } from './profile.gateway';
import { parseProfile } from './profile.mapper';

export type FakeScenario =
  | 'student'
  | 'mentor'
  | 'missing-data'
  | 'invalid-data'
  | 'failure'
  | 'session-expired';

const samples = {
  student: {
    username: 'sample.student',
    role: 'student',
    first_name: 'Sample',
    last_name: 'Student',
    email: 'sample.student@example.invalid',
    zip_code: '00000',
    gender: 'Prefer not to say',
    grade_level: '10',
    country: 'Sampleland',
    state: 'Sample State',
    school: 'Sample High School',
  },
  mentor: {
    username: 'sample.mentor',
    role: 'mentor',
    first_name: 'Sample',
    last_name: 'Mentor',
    email: 'sample.mentor@example.invalid',
    country: 'Sampleland',
    state: 'Sample State',
    school: 'Sample University',
  },
  'missing-data': { username: 'sample.minimal', role: 'student' },
  'invalid-data': { username: 123, role: 'wizard' },
};

export function createFakeProfileGateway(
  opts: {
    scenario?: FakeScenario;
    delayMs?: number;
    failTimes?: number;
  } = {},
): ProfileGateway {
  const { scenario = 'student', delayMs = 500, failTimes = 0 } = opts;
  let failuresLeft = failTimes;
  const wait = () => new Promise((r) => setTimeout(r, delayMs));

  return {
    async getProfile() {
      await wait();
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new ProfileError('network', 'Fake network failure');
      }
      if (scenario === 'failure')
        throw new ProfileError('network', 'Fake network failure');
      if (scenario === 'session-expired')
        throw new ProfileError('session-expired', 'Fake expired session');
      return parseProfile(samples[scenario]);
    },
  };
}
