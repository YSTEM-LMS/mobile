import type { LessonRequest } from '@/features/lessons/api/lesson.types';

export const START_POSITION =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Position after 1. e4, Black to move.
export const BLACK_TO_MOVE =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

// Topic string from Learn. The demo records' info text mentions this topic.
// Confirm it is the exact `piece` the backend matched.
const DEMO_TOPIC = 'Knight - It moves in an L shape';

export type ExerciseFixture = {
  lesson: LessonRequest;
  startFen: string;
  solution: string;
};

// The two real records Brandon shared (local demo seed). Same position,
// different answers.
export const demoIntroduction: ExerciseFixture = {
  lesson: { piece: DEMO_TOPIC, lessonNumber: 1 },
  startFen: START_POSITION,
  solution: 'e2e4',
};

export const demoChallenge: ExerciseFixture = {
  lesson: { piece: DEMO_TOPIC, lessonNumber: 2 },
  startFen: START_POSITION,
  solution: 'd2d4',
};

// A different position and answer, so two records can be told apart.
export const knightMove: ExerciseFixture = {
  lesson: { piece: 'Fixture topic', lessonNumber: 1 },
  startFen: '4k3/8/8/8/8/8/8/1N2K3 w - - 0 1',
  solution: 'b1c3',
};

// The learner plays Black.
export const blackLearner: ExerciseFixture = {
  lesson: { piece: 'Fixture topic', lessonNumber: 2 },
  startFen: BLACK_TO_MOVE,
  solution: 'e7e5',
};

// Learner e2e4, scripted reply e7e5, learner g1f3. No real record has a
// scripted reply yet, so this format is only exercised by fixtures.
export const scriptedReply: ExerciseFixture = {
  lesson: { piece: 'Fixture topic', lessonNumber: 3 },
  startFen: START_POSITION,
  solution: 'e2e4 e7e5 g1f3',
};

export const promotion: ExerciseFixture = {
  lesson: { piece: 'Fixture topic', lessonNumber: 4 },
  startFen: '8/P6k/8/8/8/8/8/K7 w - - 0 1',
  solution: 'a7a8q',
};

// Not supported in this milestone: SAN and PGN text.
export const sanSolution = 'e4';
export const pgnSolution = '1. e4 e5';
