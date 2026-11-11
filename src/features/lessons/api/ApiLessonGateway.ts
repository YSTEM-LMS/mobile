import { apiClient } from '@/services/api/apiClient';
import type { ApiClientInterface } from '@/types/apiClient.types';

import type { LessonGateway } from './lesson.gateway';
import { parseLesson, parseLessonRequest } from './lesson.mapper';

export function createApiLessonGateway(
  client: ApiClientInterface = apiClient,
): LessonGateway {
  return {
    async getLesson(request, options) {
      const validRequest = parseLessonRequest(request);
      const query = new URLSearchParams({
        piece: validRequest.piece,
        lessonNum: String(validRequest.lessonNumber),
      });

      const response = await client.get<unknown>(
        `/lessons/getLesson?${query.toString()}`,
        {
          signal: options?.signal,
        },
      );

      return parseLesson(response);
    },
  };
}
