export type Lesson = {
  startFen: string;
  name: string;
  info: string;
  solution: string;
  goal: number;
  opponentConstraints: unknown[];
  maxMoves: number;
  moves: unknown[];
};

export type LessonRequest = {
  piece: string;
  lessonNumber: number;
};

export type LessonRequestOptions = {
  signal?: AbortSignal;
};
