export const sanitizedLessonResponseFixture = {
  startFen: 'sanitized-fen',
  name: 'Sanitized lesson',
  info: 'Sanitized lesson instructions.',
  solution: 'e2e4',
  goal: { type: 'CAPTURE', min: 1 },
  opponentConstraints: [
    { type: 'AVOID_CAPTURING' },
    { type: 'AVOID_SQUARES', squares: ['a1'] },
  ],
  maxMoves: 10,
  moves: [{ from: 'e2', to: 'e4', piece: 'p' }],
};
