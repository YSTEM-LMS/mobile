import { apiClient } from '@/services/api/apiClient';
import type { ApiClientInterface } from '@/types/apiClient.types';

import type { LessonGateway } from './lesson.gateway';
import { parseLesson } from './lesson.mapper';

export function createApiLessonGateway(
  client: ApiClientInterface = apiClient,
): LessonGateway {
  return {
    async getLesson(request, options) {
      const query = new URLSearchParams({
        piece: request.piece,
        lessonNum: String(request.lessonNumber),
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
