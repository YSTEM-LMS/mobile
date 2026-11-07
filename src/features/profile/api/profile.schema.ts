import { z } from 'zod';

export const ProfileResponseSchema = z.object({
  username: z.string().min(1),
  role: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.enum(['student', 'mentor'])),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  email: z.string().nullish(),
  zipcode: z.string().nullish(),
  gender: z.string().nullish(),
  gradeLevel: z.string().nullish(),
  country: z.string().nullish(),
  state: z.string().nullish(),
  school: z.string().nullish(),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
