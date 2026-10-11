import { z } from 'zod';

export const ProfileResponseSchema = z.object({
  username: z.string().min(1),
  role: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.enum(['student', 'mentor'])),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  email: z.string().nullish(),
  zip_code: z.string().nullish(),
  gender: z.string().nullish(),
  grade_level: z.string().nullish(),
  country: z.string().nullish(),
  state: z.string().nullish(),
  school: z.string().nullish(),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
