import { createFakeProfileGateway } from '../src/features/profile/api/fakeProfileGateway';

const make = (opts = {}) => createFakeProfileGateway({ delayMs: 0, ...opts });

describe('FakeProfileGateway', () => {
  test('student scenario', async () => {
    const p = await make({ scenario: 'student' }).getProfile();
    expect(p.role).toBe('student');
    expect(p.gradeLevel).not.toBeNull();
  });

  test('mentor scenario', async () => {
    expect((await make({ scenario: 'mentor' }).getProfile()).role).toBe(
      'mentor',
    );
  });

  test('missing-data scenario has null optional fields', async () => {
    const p = await make({ scenario: 'missing-data' }).getProfile();
    expect(p.school).toBeNull();
    expect(p.location).toBeNull();
  });

  test('failure scenario rejects with a network error', async () => {
    await expect(
      make({ scenario: 'failure' }).getProfile(),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  test('invalid-data scenario is rejected by validation', async () => {
    await expect(
      make({ scenario: 'invalid-data' }).getProfile(),
    ).rejects.toMatchObject({ kind: 'invalid-data' });
  });

  test('session-expired scenario', async () => {
    await expect(
      make({ scenario: 'session-expired' }).getProfile(),
    ).rejects.toMatchObject({ kind: 'session-expired' });
  });

  test('failTimes fails the first N calls, then succeeds', async () => {
    const gateway = make({ failTimes: 1 });
    await expect(gateway.getProfile()).rejects.toMatchObject({
      kind: 'network',
    });
    await expect(gateway.getProfile()).resolves.toMatchObject({
      role: 'student',
    });
  });
});
