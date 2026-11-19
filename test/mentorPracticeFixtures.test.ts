import { Chess, DEFAULT_POSITION } from 'chess.js';

import {
  mentorPracticeWorkedExample,
  practicePositions,
} from '@/features/play/services/mentorPracticeFixtures';

describe('mentorPracticeWorkedExample', () => {
  const { mentorJoin, studentJoin, studentMove } = mentorPracticeWorkedExample;

  it('joins the same pair from both roles with opposite colors', () => {
    expect(mentorJoin.emitted.payload).toEqual(mentorJoin.pair);
    expect(studentJoin.emitted.payload).toEqual(studentJoin.pair);
    expect(mentorJoin.result.color).toBe('black');
    expect(studentJoin.result.color).toBe('white');
  });

  it('matches each join reply to its result', () => {
    for (const join of [mentorJoin, studentJoin]) {
      expect(join.result).toEqual({
        fen: join.serverReply.payload.boardState,
        color: join.serverReply.payload.color,
      });
      expect(join.result.fen).toBe(DEFAULT_POSITION);
    }
  });

  it('produces the board update with chess.js', () => {
    const board = new Chess(DEFAULT_POSITION);
    board.move(studentMove.move);

    expect(studentMove.serverReply.payload.boardState).toBe(board.fen());
    expect(studentMove.event).toEqual({ type: 'board', fen: board.fen() });
    expect(studentMove.emitted.payload).toEqual(studentMove.move);
  });
});

describe('practicePositions', () => {
  it('whiteMatesInOne ends in checkmate', () => {
    const { fen, move, fenAfter } = practicePositions.whiteMatesInOne;
    const board = new Chess(fen);
    board.move(move);

    expect(board.fen()).toBe(fenAfter);
    expect(board.isCheckmate()).toBe(true);
  });

  it('whiteStalematesInOne ends in stalemate', () => {
    const { fen, move, fenAfter } = practicePositions.whiteStalematesInOne;
    const board = new Chess(fen);
    board.move(move);

    expect(board.fen()).toBe(fenAfter);
    expect(board.isStalemate()).toBe(true);
  });

  it('promotionRejected fails without a promotion piece', () => {
    const { fen, move, message } = practicePositions.promotionRejected;

    expect(() => new Chess(fen).move(move)).toThrow(message);
    expect(() =>
      new Chess(fen).move({ ...move, promotion: 'q' }),
    ).not.toThrow();
  });
});
