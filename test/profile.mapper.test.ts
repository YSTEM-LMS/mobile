import {
  mapProfile,
  parseProfile,
} from '../src/features/profile/api/profile.mapper';
import { ProfileError } from '../src/features/profile/api/profile.errors';

describe('mapProfile', () => {
  test('builds fullName and location', () => {
    const p = mapProfile({
      username: 'a',
      role: 'student',
      first_name: 'Sample',
      last_name: 'Student',
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
      mapProfile({ username: 'a', role: 'mentor', first_name: 'Sample' })
        .fullName,
    ).toBe('Sample');
  });
});

describe('parseProfile', () => {
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
