import { Chess } from 'chess.js';

import { isLegalEngineMove } from '@/features/play/services/StockfishClient';
import {
  engineRepliesByFen,
  engineReplyFixtures,
  evaluationCompletePayload,
  stockfishWorkedExample,
} from '@/features/play/services/stockfishFixtures';

describe('stockfishWorkedExample', () => {
  const example = stockfishWorkedExample;

  it("applies the player's move once to reach the request position", () => {
    const board = new Chess(example.startingFen);
    const played = board.move({
      from: example.playerMove.uci.slice(0, 2),
      to: example.playerMove.uci.slice(2, 4),
    });

    expect(played.san).toBe(example.playerMove.san);
    expect(board.fen()).toBe(example.request.fen);
    expect(example.emitted).toEqual({
      fen: example.request.fen,
      move: '',
      level: example.request.level,
    });
  });

  it('has a server reply that is legal and consistent with the request', () => {
    const expected = evaluationCompletePayload(
      example.request.fen,
      example.serverReply.move,
    );
    const withoutEnPassant = (fen: string) =>
      fen.split(' ').filter((_, index) => index !== 3);

    expect({ ...example.serverReply, newFEN: expected.newFEN }).toEqual(
      expected,
    );
    expect(withoutEnPassant(example.serverReply.newFEN)).toEqual(
      withoutEnPassant(example.fenAfterEngineMove),
    );
    expect(example.engineMove.move).toBe(example.serverReply.move);
  });

  it("reaches fenAfterEngineMove by applying the engine's move", () => {
    const board = new Chess(example.request.fen);

    expect(isLegalEngineMove(board, example.engineMove.move)).toBe(true);
    expect(board.fen()).toBe(example.fenAfterEngineMove);
  });
});

describe('engineReplyFixtures', () => {
  it.each(engineReplyFixtures)(
    'is a legal position and reply: $name',
    (fixture) => {
      const board = new Chess(fixture.fen);

      expect(board.isGameOver() && fixture.move !== null).toBe(false);
      expect(isLegalEngineMove(board, fixture.move)).toBe(true);
    },
  );

  it('covers promotions and positions with no legal move', () => {
    const moves = engineReplyFixtures.map(({ move }) => move);

    expect(moves).toEqual(expect.arrayContaining(['a2a1q', 'f2f1n', null]));
  });

  it('indexes every fixture by FEN', () => {
    expect(Object.keys(engineRepliesByFen)).toHaveLength(
      engineReplyFixtures.length,
    );
  });
});
