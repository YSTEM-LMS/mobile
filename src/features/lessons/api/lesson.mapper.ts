import {
  LessonRequestSchema,
  LessonResponseSchema,
  type LessonResponse,
} from './lesson.schema';
import type { Lesson, LessonRequest } from './lesson.types';
import { AppError } from '@/services/api/apiError';

export function parseLessonRequest(raw: unknown): LessonRequest {
  const result = LessonRequestSchema.safeParse(raw);
  if (!result.success) {
    throw new AppError(
      'INVALID_RESPONSE',
      'Lesson requests require a piece and a positive lesson number.',
    );
  }
  return result.data;
}

export function mapLesson(r: LessonResponse): Lesson {
  return {
    startFen: r.startFen,
    name: r.name,
    info: r.info,
    solution: r.solution ?? null,
    goal: r.goal ?? null,
    opponentConstraints: r.opponentConstraints ?? null,
    maxMoves: r.maxMoves ?? null,
    moves: r.moves ?? null,
  };
}

export function parseLesson(raw: unknown): Lesson {
  const result = LessonResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new AppError(
      'INVALID_RESPONSE',
      'Lesson data was not in the expected format',
    );
  }
  return mapLesson(result.data);
}
