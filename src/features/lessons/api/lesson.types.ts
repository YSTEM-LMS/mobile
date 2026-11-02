export type Lesson = {
  lessonNumber: number;
  startFen: string;
  endFen: string;
  endSquare: string | null;
};

export type LessonRequest = {
  piece: string;
  lessonNumber: number;
};

export type LessonRequestOptions = {
  signal?: AbortSignal;
};
