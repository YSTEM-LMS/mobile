import { z } from 'zod';

export const LessonResponseSchema = z.object({
  lessonNumber: z.number().int().positive(),
  // All-caps FEN to match backend field naming
  startFEN: z.string().trim().min(1),
  endFEN: z.string().trim().min(1),
  endSquare: z.string(),
});

export type LessonResponse = z.infer<typeof LessonResponseSchema>;
