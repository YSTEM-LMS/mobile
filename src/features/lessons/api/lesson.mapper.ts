import { LessonResponseSchema, type LessonResponse } from './lesson.schema';
import type { Lesson } from './lesson.types';
import { AppError } from '@/services/api/apiError';

export function mapLesson(r: LessonResponse): Lesson {
  return {
    lessonNumber: r.lessonNumber,
    startFen: r.startFEN,
    endFen: r.endFEN,
    endSquare: r.endSquare.trim() || null,
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
