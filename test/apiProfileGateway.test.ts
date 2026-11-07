import { createApiProfileGateway } from '@/features/profile/api/ApiProfileGateway';
import { ProfileError } from '@/features/profile/api/profile.errors';
import { AppError } from '@/services/api/apiError';
import type { ApiClientInterface } from '@/types/apiClient.types';

const makeClient = (get: jest.Mock) =>
  ({
    get,
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }) as unknown as ApiClientInterface;

const valid = {
  username: 'alice',
  role: 'Student',
  firstName: ' Alice ',
  lastName: 'Lee',
  school: 'Test High',
  gradeLevel: '10',
  state: 'CA',
  country: 'USA',
};

const backendResponse = {
  _id: 'abc123',
  username: 'sample.student',
  accountCreatedAt: '1/1/2026, 12:00:00 PM',
  avatarKey: null,
  birthday: null,
  country: null,
  email: 'sample@example.invalid',
  firstName: 'Sample',
  gender: null,
  gradeLevel: null,
  highestStreak: 0,
  lastName: 'Student',
  lessonsCompleted: [{ _id: 'l1', piece: 'Lesson', lessonNumber: 0 }],
  mentorshipUsername: 'sample.mentor',
  occupation: null,
  role: 'student',
  school: null,
  state: null,
  timePlayed: 0,
  zipcode: null,
};

describe('ApiProfileGateway', () => {
  it('calls the endpoint with an encoded username and forwards the signal', async () => {
    const get = jest.fn().mockResolvedValue(valid);
    const { signal } = new AbortController();
    await createApiProfileGateway(makeClient(get)).getProfile('a b+c/d?x=1&y', {
      signal,
    });

    expect(get).toHaveBeenCalledWith(
      `/user/getUser?username=${encodeURIComponent('a b+c/d?x=1&y')}`,
      { signal },
    );
  });

  it('validates and maps a valid response', async () => {
    const get = jest.fn().mockResolvedValue(valid);
    const profile = await createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );

    expect(profile).toMatchObject({
      username: 'alice',
      role: 'student',
      fullName: 'Alice Lee',
      gradeLevel: '10',
      location: 'CA, USA',
      email: null,
    });
  });

  it('accepts and maps the backend response shape', async () => {
    const get = jest.fn().mockResolvedValue(backendResponse);
    const profile = await createApiProfileGateway(makeClient(get)).getProfile(
      'sample.student',
    );

    expect(profile).toMatchObject({
      username: 'sample.student',
      role: 'student',
      firstName: 'Sample',
      lastName: 'Student',
      fullName: 'Sample Student',
      email: 'sample@example.invalid',
      zipCode: null,
      gradeLevel: null,
      location: null,
    });
  });

  it('accepts a minimal response with missing optional fields', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ username: 'alice', role: 'student' });
    const profile = await createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );
    expect(profile).toMatchObject({
      fullName: null,
      school: null,
      location: null,
    });
  });

  it.each([
    ['null body', null],
    ['wrong types', { username: 123, role: 'wizard' }],
    ['not an object', 'oops'],
  ])('throws invalid-data for %s', async (_name, body) => {
    const get = jest.fn().mockResolvedValue(body);
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toMatchObject({ name: 'ProfileError', kind: 'invalid-data' });
  });

  it('maps INVALID_RESPONSE from the client to invalid-data', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(new AppError('INVALID_RESPONSE', 'bad json', 200));
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toMatchObject({ kind: 'invalid-data' });
  });

  it.each([
    new AppError('NETWORK_ERROR', 'offline'),
    new AppError('REQUEST_TIMEOUT', 'slow'),
    new AppError('SERVER_ERROR', 'boom', 500),
    new AppError('PERMISSION_DENIED', 'no', 403),
    new Error('something unexpected'),
  ])('maps %p to a safe network error', async (err) => {
    const get = jest.fn().mockRejectedValue(err);
    const promise = createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );
    await expect(promise).rejects.toBeInstanceOf(ProfileError);
    await expect(promise).rejects.toMatchObject({ kind: 'network' });
  });

  it('maps SESSION_EXPIRED to session-expired', async () => {
    const err = new AppError('SESSION_EXPIRED', 'x', 401);
    const get = jest.fn().mockRejectedValue(err);
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toMatchObject({ kind: 'session-expired' });
  });

  it('rethrows REQUEST_CANCEL unchanged', async () => {
    const err = new AppError('REQUEST_CANCEL', 'x');
    const get = jest.fn().mockRejectedValue(err);
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toBe(err);
  });
});
