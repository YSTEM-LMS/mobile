// This is a fake lesson gateway implementation used in test/lessonGateway.test.ts

import { AppError } from '@/services/api/apiError';
import type { LessonGateway } from './lesson.gateway';
import { parseLesson, parseLessonRequest } from './lesson.mapper';
import { sanitizedLessonResponseFixture } from './lesson.fixtures';
import type { LessonRequest } from './lesson.types';

export type FakeLessonScenario = 'valid' | 'invalid-data' | 'failure';

export function createFakeLessonGateway(
  options: { scenario?: FakeLessonScenario; delayMs?: number } = {},
): LessonGateway {
  const { scenario = 'valid', delayMs = 0 } = options;
  return {
    async getLesson(rawRequest: LessonRequest) {
      parseLessonRequest(rawRequest);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (scenario === 'failure') {
        throw new AppError('NETWORK_ERROR', 'Unable to connect to the server.');
      }
      if (scenario === 'invalid-data') {
        throw new AppError(
          'INVALID_RESPONSE',
          'Lesson data was not in the expected format',
        );
      }
      return parseLesson(sanitizedLessonResponseFixture);
    },
  };
}
