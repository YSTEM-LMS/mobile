import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/services/api/apiError';
import { useSession } from '@/providers/SessionProvider';

import { lessonProgressGateway } from '../api/lessonProgressGatewayProvider';
import type { LessonCompletion } from '../api/lessonProgress.gateway';

export const lessonProgressQueryKey = (
  username: string | null,
  piece: string,
) => ['lesson-progress', username, piece] as const;

export function lessonProgressQueryOptions(
  username: string | null,
  piece: string,
) {
  return {
    queryKey: lessonProgressQueryKey(username, piece),
    enabled: username !== null,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      lessonProgressGateway.getCompletedLessonCount(piece, { signal }),
  };
}

export function useLessonProgress(piece: string) {
  const { session, expiredSession } = useSession();
  const username =
    session.status === 'authenticated' ? session.user.username : null;
  const query = useQuery(lessonProgressQueryOptions(username, piece));

  useEffect(() => {
    if (
      query.error instanceof AppError &&
      query.error.code === 'SESSION_EXPIRED'
    ) {
      void expiredSession();
    }
  }, [query.error, expiredSession]);

  return query;
}

export function useSaveLessonCompletion() {
  const queryClient = useQueryClient();
  const { session, expiredSession } = useSession();
  const username =
    session.status === 'authenticated' ? session.user.username : null;

  return useMutation({
    mutationFn: async (completion: LessonCompletion) => {
      if (!username) {
        throw new AppError(
          'PERMISSION_DENIED',
          'Sign in to save lesson progress.',
        );
      }

      await lessonProgressGateway.saveLessonCompletion(completion);
      const completedLessonCount =
        await lessonProgressGateway.getCompletedLessonCount(completion.piece);
      if (completedLessonCount < completion.lessonNumber) {
        throw new AppError(
          'SERVER_ERROR',
          'The server did not confirm the lesson completion.',
        );
      }

      return completedLessonCount;
    },
    onSuccess: (_result, completion) =>
      queryClient.invalidateQueries({
        queryKey: lessonProgressQueryKey(username, completion.piece),
      }),
    onError: async (error) => {
      if (error instanceof AppError && error.code === 'SESSION_EXPIRED') {
        await expiredSession();
      }
    },
  });
}
