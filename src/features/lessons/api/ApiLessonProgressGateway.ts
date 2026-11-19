import { z } from 'zod';

import { apiClient } from '@/services/api/apiClient';
import { AppError } from '@/services/api/apiError';
import type { ApiClientInterface } from '@/types/apiClient.types';

import type { LessonProgressGateway } from './lessonProgress.gateway';

const pieceSchema = z.string().trim().min(1);
const lessonNumberSchema = z.number().int().positive();
const completedLessonCountSchema = z.number().int().nonnegative();

export function createApiLessonProgressGateway(
  client: ApiClientInterface = apiClient,
): LessonProgressGateway {
  return {
    async getCompletedLessonCount(rawPiece, options) {
      const piece = pieceSchema.safeParse(rawPiece);
      if (!piece.success) {
        throw new AppError('UNKNOWN', 'A lesson piece is required.');
      }

      const query = new URLSearchParams({ piece: piece.data });
      const response = await client.get<unknown>(
        `/lessons/getCompletedLessonCount?${query.toString()}`,
        { signal: options?.signal },
      );
      const count = completedLessonCountSchema.safeParse(response);
      if (!count.success) {
        throw new AppError(
          'INVALID_RESPONSE',
          'Lesson progress was not a valid completed lesson count.',
        );
      }

      return count.data;
    },

    async saveLessonCompletion(completion, options) {
      const piece = pieceSchema.safeParse(completion.piece);
      const lessonNumber = lessonNumberSchema.safeParse(
        completion.lessonNumber,
      );
      if (!piece.success || !lessonNumber.success) {
        throw new AppError('UNKNOWN', 'Invalid lesson completion request.');
      }

      const query = new URLSearchParams({
        piece: piece.data,
        lessonNum: String(lessonNumber.data - 1),
      });
      await client.get(
        `/lessons/updateLessonCompletion?${query.toString()}`,
        { responseType: 'text', signal: options?.signal },
      );
    },
  };
}
