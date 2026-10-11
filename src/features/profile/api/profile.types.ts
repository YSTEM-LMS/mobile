export type ProfileRole = 'student' | 'mentor';

export type Profile = {
  username: string;
  role: ProfileRole;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  zipCode: string | null;
  gender: string | null;
  gradeLevel: string | null;
  country: string | null;
  state: string | null;
  school: string | null;
  location: string | null;
};
