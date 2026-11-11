import { z } from 'zod';

export const LessonRequestSchema = z.object({
  piece: z.string().trim().min(1),
  lessonNumber: z.number().int().positive(),
});

export const LessonResponseSchema = z.object({
  startFen: z.string().trim().min(1),
  name: z.string().trim().min(1),
  info: z.string(),
  solution: z.string(),
  goal: z.number(),
  opponentConstraints: z.array(z.unknown()),
  maxMoves: z.number().int().nonnegative(),
  moves: z.array(z.unknown()),
});

export type LessonResponse = z.infer<typeof LessonResponseSchema>;
