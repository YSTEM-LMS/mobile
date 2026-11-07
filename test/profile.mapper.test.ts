import {
  mapProfile,
  parseProfile,
} from '../src/features/profile/api/profile.mapper';
import { ProfileError } from '../src/features/profile/api/profile.errors';

// Shaped like the real backend response, with placeholder values
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

describe('mapProfile', () => {
  test('builds fullName and location', () => {
    const p = mapProfile({
      username: 'a',
      role: 'student',
      firstName: 'Sample',
      lastName: 'Student',
      state: 'Sample State',
      country: 'Sampleland',
    });
    expect(p.fullName).toBe('Sample Student');
    expect(p.location).toBe('Sample State, Sampleland');
  });

  test('turns missing and blank values into null', () => {
    const p = mapProfile({ username: 'a', role: 'student', school: '   ' });
    expect(p.fullName).toBeNull();
    expect(p.location).toBeNull();
    expect(p.school).toBeNull();
    expect(p.gradeLevel).toBeNull();
  });

  test('uses whatever parts of the name exist', () => {
    expect(
      mapProfile({ username: 'a', role: 'mentor', firstName: 'Sample' })
        .fullName,
    ).toBe('Sample');
  });
});

describe('parseProfile', () => {
  test('accepts and maps the backend response shape', () => {
    expect(parseProfile(backendResponse)).toMatchObject({
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

  test('returns a Profile for valid data', () => {
    expect(parseProfile({ username: 'a', role: 'mentor' }).role).toBe('mentor');
  });

  test('throws an invalid-data ProfileError for bad data', () => {
    expect(() => parseProfile({ username: 123 })).toThrow(ProfileError);
    try {
      parseProfile({ username: 123 });
    } catch (e) {
      expect((e as ProfileError).kind).toBe('invalid-data');
    }
  });
});
