export type LessonCompletion = {
  piece: string;
  lessonNumber: number;
};

export type LessonProgressRequestOptions = {
  signal?: AbortSignal;
};

export interface LessonProgressGateway {
  getCompletedLessonCount(
    piece: string,
    options?: LessonProgressRequestOptions,
  ): Promise<number>;
  saveLessonCompletion(
    completion: LessonCompletion,
    options?: LessonProgressRequestOptions,
  ): Promise<void>;
}
