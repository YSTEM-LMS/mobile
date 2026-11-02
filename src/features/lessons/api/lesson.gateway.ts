import type {
  Lesson,
  LessonRequest,
  LessonRequestOptions,
} from './lesson.types';

export interface LessonGateway {
  getLesson(
    request: LessonRequest,
    options?: LessonRequestOptions,
  ): Promise<Lesson>;
}
