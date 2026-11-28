import { Chess } from 'chess.js';

import {
  fullPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle } from '../src/features/puzzles/mapper';
import { attemptLearnerMove } from '../src/features/puzzles/puzzleMoves';
import { playOpponentReply } from '../src/features/puzzles/puzzleReplies';
import { initializePuzzle } from '../src/features/puzzles/puzzleSetup';

const fullPuzzle = mapPuzzle(fullPuzzleFixture);
const partialPuzzle = mapPuzzle(partialPuzzleFixture);

function afterCorrectFirstAnswer(
  puzzle: typeof fullPuzzle,
  from: 'b8' | 'e7',
  to: 'c6' | 'e6',
) {
  const setup = initializePuzzle(puzzle);
  if (setup.status !== 'ready') throw new Error('Expected playable fixture');

  const answer = attemptLearnerMove(puzzle, setup, from, to);
  if (answer.status !== 'correct') throw new Error('Expected correct answer');

  return answer;
}

describe('playOpponentReply', () => {
  it('plays the next scripted opponent reply exactly once', () => {
    const answer = afterCorrectFirstAnswer(fullPuzzle, 'b8', 'c6');
    const expectedGame = new Chess(answer.fen);
    expectedGame.move({ from: 'f1', to: 'c4' });

    const result = playOpponentReply(fullPuzzle, answer);

    expect(result).toMatchObject({
      status: 'played',
      fen: expectedGame.fen(),
      nextMoveIndex: 3,
      lastMove: { from: 'f1', to: 'c4' },
      isComplete: true,
    });
    // Calling again with the advanced index cannot replay the same move.
    if (result.status !== 'played') throw new Error('Expected scripted reply');
    expect(playOpponentReply(fullPuzzle, result)).toEqual({
      status: 'no-reply',
      fen: result.fen,
      nextMoveIndex: 3,
      isComplete: true,
    });
    // The input is never mutated.
    expect(answer.nextMoveIndex).toBe(2);
  });

  it('returns control to the learner if another answer follows the reply', () => {
    const puzzle = { ...fullPuzzle, moves: [...fullPuzzle.moves, 'g8f6'] };
    const answer = afterCorrectFirstAnswer(puzzle, 'b8', 'c6');

    const reply = playOpponentReply(puzzle, answer);
    expect(reply).toMatchObject({
      status: 'played',
      nextMoveIndex: 3,
      isComplete: false,
    });
    if (reply.status !== 'played') throw new Error('Expected scripted reply');

    expect(attemptLearnerMove(puzzle, reply, 'g8', 'f6')).toMatchObject({
      status: 'correct',
      nextMoveIndex: 4,
      isComplete: true,
    });
  });

  it('returns no-reply without changing a completed learner position', () => {
    const answer = afterCorrectFirstAnswer(partialPuzzle, 'e7', 'e6');

    expect(playOpponentReply(partialPuzzle, answer)).toEqual({
      status: 'no-reply',
      fen: answer.fen,
      nextMoveIndex: 2,
      isComplete: true,
    });
  });

  it('supports opponent pawn promotion encoded in UCI', () => {
    const game = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    game.move({ from: 'a1', to: 'b1' });
    game.move({ from: 'h7', to: 'h6' });

    const result = playOpponentReply(
      { moves: ['a1b1', 'h7h6', 'a7a8q', 'h6g5'] },
      { fen: game.fen(), nextMoveIndex: 2 },
    );

    expect(result).toMatchObject({ status: 'played', nextMoveIndex: 3 });
    if (result.status !== 'played') throw new Error('Expected promotion reply');
    expect(new Chess(result.fen).get('a8')).toEqual({ type: 'q', color: 'w' });
  });

  it('reports malformed scripted replies as recoverable errors', () => {
    const answer = afterCorrectFirstAnswer(fullPuzzle, 'b8', 'c6');
    expect(
      playOpponentReply({ moves: ['g1f3', 'b8c6', 'f1c9'] }, answer),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('reports legal-format but illegal opponent replies as recoverable errors', () => {
    const answer = afterCorrectFirstAnswer(fullPuzzle, 'b8', 'c6');
    expect(
      playOpponentReply({ moves: ['g1f3', 'b8c6', 'a1a8'] }, answer),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('reports an invalid FEN without throwing', () => {
    expect(
      playOpponentReply(fullPuzzle, { fen: 'not-a-fen', nextMoveIndex: 2 }),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('rejects attempts to play a reply when it is the learner turn', () => {
    const setup = initializePuzzle(fullPuzzle);
    if (setup.status !== 'ready') throw new Error('Expected playable fixture');

    expect(playOpponentReply(fullPuzzle, setup)).toMatchObject({
      status: 'unplayable',
    });
  });

  it('rejects a move index outside the recorded sequence', () => {
    expect(
      playOpponentReply(fullPuzzle, { fen: fullPuzzle.fen, nextMoveIndex: 10 }),
    ).toMatchObject({ status: 'unplayable' });
  });
});
