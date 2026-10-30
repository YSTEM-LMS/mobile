import { ProfileResponseSchema, type ProfileResponse } from './profile.schema';
import { ProfileError } from './profile.errors';
import type { Profile } from './profile.types';

const clean = (v?: string | null) => (v?.trim() ? v.trim() : null);
const join = (parts: (string | null)[], sep: string) =>
  parts.filter(Boolean).join(sep) || null;

export function mapProfile(r: ProfileResponse): Profile {
  const firstName = clean(r.first_name);
  const lastName = clean(r.last_name);
  const state = clean(r.state);
  const country = clean(r.country);
  return {
    username: r.username,
    role: r.role,
    firstName,
    lastName,
    fullName: join([firstName, lastName], ' '),
    email: clean(r.email),
    zipCode: clean(r.zip_code),
    gender: clean(r.gender),
    gradeLevel: clean(r.grade_level),
    country,
    state,
    school: clean(r.school),
    location: join([state, country], ', '),
  };
}

export function parseProfile(raw: unknown): Profile {
  const result = ProfileResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new ProfileError(
      'invalid-data',
      'Profile data was not in the expected format',
    );
  }
  return mapProfile(result.data);
}
