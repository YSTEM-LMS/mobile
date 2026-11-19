import { useQuery } from '@tanstack/react-query';

import { lessonGateway } from '../api/gatewayProvider';
import type { LessonRequest } from '../api/lesson.types';

export const lessonQueryKey = ({ piece, lessonNumber }: LessonRequest) =>
  ['lesson', piece, lessonNumber] as const;

export function useLesson(request: LessonRequest | null) {
  return useQuery({
    queryKey: request ? lessonQueryKey(request) : ['lesson', 'invalid'],
    queryFn: ({ signal }) => lessonGateway.getLesson(request!, { signal }),
    enabled: request !== null,
  });
}
