import { ProfileResponseSchema } from '../src/features/profile/api/profile.schema';

const student = {
  username: 'sample.student',
  role: 'student',
  first_name: 'Sample',
  last_name: 'Student',
  email: 'sample.student@example.invalid',
  school: 'Sample High School',
  grade_level: '10',
};

describe('ProfileResponseSchema', () => {
  test('accepts a valid student', () => {
    expect(ProfileResponseSchema.safeParse(student).success).toBe(true);
  });

  test('accepts a valid mentor, and role in any letter case', () => {
    const result = ProfileResponseSchema.safeParse({
      ...student,
      role: 'MENTOR',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe('mentor');
  });

  test('accepts missing and null optional fields', () => {
    expect(
      ProfileResponseSchema.safeParse({
        username: 'a',
        role: 'student',
        school: null,
      }).success,
    ).toBe(true);
  });

  test.each([
    ['missing username', { role: 'student' }],
    ['wrong type', { username: 123, role: 'student' }],
    ['unknown role', { username: 'a', role: 'wizard' }],
    ['not an object', null],
  ])('rejects %s', (_name, data) => {
    expect(ProfileResponseSchema.safeParse(data).success).toBe(false);
  });
});
