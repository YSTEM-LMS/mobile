import { act, renderHook } from '@testing-library/react-native';
import { Chess, type Square } from 'chess.js';

import {
  difficultyToLevel,
  START_FEN,
  useComputerGame,
} from '@/features/play/services/hooks/useComputerGame';
import type {
  EngineMove,
  StockfishClient,
} from '@/features/play/services/StockfishClient';

import { createFakeStockfishClient } from '@/features/play/services/fakeStockfishClient';

type MoveRequest = Parameters<StockfishClient['requestMove']>[0];
type Hook = { current: ReturnType<typeof useComputerGame> };

// Position after White's 1. e4, Black to move. The engine request must carry
// this FEN and no separate move.
const FEN_AFTER_E4 =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** A scripted stand-in for the Stockfish client. No sockets involved. */
class FakeClient implements StockfishClient {
  calls: string[] = [];
  requests: MoveRequest[] = [];
  onStart: () => Promise<void> = () => Promise.resolve();
  onMove: (request: MoveRequest) => Promise<EngineMove> = () =>
    Promise.resolve({ move: 'e7e5' });

  startSession(): Promise<void> {
    this.calls.push('startSession');
    return this.onStart();
  }

  requestMove(request: MoveRequest): Promise<EngineMove> {
    this.calls.push('requestMove');
    this.requests.push(request);
    return this.onMove(request);
  }

  disconnect(): void {
    this.calls.push('disconnect');
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run (same approach as StockfishClient tests). */
function flushPromises(): Promise<void> {
  return new Promise((resolve) =>
    jest.requireActual('timers').setImmediate(resolve),
  );
}

async function settle() {
  await act(async () => {
    await flushPromises();
  });
}

function setup(
  fake: FakeClient,
  options: { difficulty?: string; initialFen?: string } = {},
) {
  return renderHook(() =>
    useComputerGame({ ...options, createClient: () => fake }),
  );
}

function play(hook: Hook, from: Square, to: Square): boolean {
  let accepted = false;
  act(() => {
    accepted = hook.current.makePlayerMove(from, to);
  });
  return accepted;
}

function pieceAt(fen: string, square: Square) {
  return new Chess(fen).get(square);
}

describe('difficultyToLevel', () => {
  it('maps the five difficulty names to engine levels 1-5', () => {
    expect(difficultyToLevel('beginner')).toBe(1);
    expect(difficultyToLevel('easy')).toBe(2);
    expect(difficultyToLevel('medium')).toBe(3);
    expect(difficultyToLevel('hard')).toBe(4);
    expect(difficultyToLevel('master')).toBe(5);
  });

  it('falls back to level 1 for unknown or missing values', () => {
    expect(difficultyToLevel('impossible')).toBe(1);
    expect(difficultyToLevel('constructor')).toBe(1);
    expect(difficultyToLevel(undefined)).toBe(1);
  });
});

describe('useComputerGame: session and moves', () => {
  it('starts the session before any engine request', async () => {
    const fake = new FakeClient();
    const { result } = setup(fake);

    expect(result.current.phase).toBe('starting');
    expect(result.current.inputDisabled).toBe(true);

    await settle();
    expect(fake.calls).toEqual(['startSession']);
    expect(result.current.phase).toBe('player-turn');
    expect(result.current.inputDisabled).toBe(false);

    play(result, 'e2', 'e4');
    await settle();

    expect(fake.calls.indexOf('startSession')).toBeLessThan(
      fake.calls.indexOf('requestMove'),
    );
  });

  it('does not accept moves while the session is starting', async () => {
    const fake = new FakeClient();
    fake.onStart = () => deferred<void>().promise;
    const { result } = setup(fake);

    expect(play(result, 'e2', 'e4')).toBe(false);
    expect(result.current.position).toBe(START_FEN);
    expect(fake.requests).toHaveLength(0);
  });

  it('applies a legal player move once and sends the position before it', async () => {
    const fake = new FakeClient();
    const reply = deferred<EngineMove>();
    fake.onMove = () => reply.promise;
    const { result } = setup(fake, { difficulty: 'hard' });
    await settle();

    expect(play(result, 'e2', 'e4')).toBe(true);
    await settle();

    // Player's move is on the board while the engine is thinking.
    expect(pieceAt(result.current.position, 'e4')).toEqual({
      type: 'p',
      color: 'w',
    });
    expect(pieceAt(result.current.position, 'e2')).toBeFalsy();
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
    // Position AFTER e4, and no separate move.
    expect(fake.requests).toEqual([{ fen: FEN_AFTER_E4, level: 4 }]);

    await act(async () => {
      reply.resolve({ move: 'e7e5' });
      await flushPromises();
    });

    // Engine reply applied once; the player's move is not applied again.
    const finalBoard = new Chess(result.current.position);
    expect(finalBoard.get('e5')).toEqual({ type: 'p', color: 'b' });
    expect(finalBoard.get('e4')).toEqual({ type: 'p', color: 'w' });
    expect(finalBoard.get('e7')).toBeFalsy();
    expect(finalBoard.turn()).toBe('w');
    expect(result.current.lastMove).toEqual({ from: 'e7', to: 'e5' });
    expect(result.current.phase).toBe('player-turn');
    expect(fake.requests).toHaveLength(1);
  });

  it('lets the player keep playing after an engine reply', async () => {
    const fake = new FakeClient();
    const replies = ['e7e5', 'b8c6'];
    fake.onMove = () => Promise.resolve({ move: replies.shift() ?? null });
    const { result } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();

    expect(play(result, 'g1', 'f3')).toBe(true);
    await settle();

    expect(fake.requests[1]).toEqual({
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      level: 1,
    });
    const board = new Chess(result.current.position);
    expect(board.get('f3')).toEqual({ type: 'n', color: 'w' });
    expect(board.get('c6')).toEqual({ type: 'n', color: 'b' });
    expect(result.current.phase).toBe('player-turn');
  });

  it('rejects illegal player moves without sending anything', async () => {
    const fake = new FakeClient();
    const { result } = setup(fake);
    await settle();

    expect(play(result, 'e2', 'e5')).toBe(false); // pawn cannot jump 3
    expect(play(result, 'e7', 'e5')).toBe(false); // not Black's turn

    expect(result.current.position).toBe(START_FEN);
    expect(result.current.phase).toBe('player-turn');
    expect(fake.requests).toHaveLength(0);
  });

  it('disables input while waiting for the engine', async () => {
    const fake = new FakeClient();
    const reply = deferred<EngineMove>();
    fake.onMove = () => reply.promise;
    const { result } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();

    expect(result.current.phase).toBe('engine-turn');
    expect(result.current.inputDisabled).toBe(true);

    // Black's pawn move would be legal for chess.js, so only the input lock
    // stops it.
    expect(play(result, 'e7', 'e5')).toBe(false);
    expect(pieceAt(result.current.position, 'e5')).toBeFalsy();
    expect(fake.requests).toHaveLength(1);

    await act(async () => {
      reply.resolve({ move: 'e7e5' });
      await flushPromises();
    });
    expect(result.current.inputDisabled).toBe(false);
  });
});

describe('useComputerGame: promotion', () => {
  it('auto-promotes a White pawn to a queen and reports it in UCI', async () => {
    const fake = new FakeClient();
    fake.onMove = () => deferred<EngineMove>().promise;
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    const { result } = setup(fake, { initialFen: fen });
    await settle();

    expect(play(result, 'a7', 'a8')).toBe(true);
    await settle();

    expect(pieceAt(result.current.position, 'a8')).toEqual({
      type: 'q',
      color: 'w',
    });
    // The promotion is already on the board in the FEN. No move is sent.
    expect(fake.requests).toEqual([
      { fen: 'Q7/7k/8/8/8/8/8/K7 b - - 0 1', level: 1 },
    ]);
  });
});

describe('useComputerGame: failures', () => {
  it.each([
    ['an illegal move', 'e2e4'],
    ['no move at all', null],
  ])('keeps a valid board when the engine sends %s', async (_name, badMove) => {
    const fake = new FakeClient();
    fake.onMove = () => Promise.resolve({ move: badMove });
    const { result } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();

    expect(result.current.phase).toBe('engine-failed');
    expect(result.current.errorMessage).toBeTruthy();
    expect(result.current.inputDisabled).toBe(true);

    const board = new Chess(result.current.position);
    expect(board.get('e4')).toEqual({ type: 'p', color: 'w' });
    expect(board.get('e7')).toEqual({ type: 'p', color: 'b' });
    expect(board.turn()).toBe('b');
  });

  it('shows session-start failures and recovers on retry', async () => {
    const fake = new FakeClient();
    fake.onStart = () =>
      Promise.reject(new Error('Stockfish connect_error: Connection refused'));
    const { result } = setup(fake);
    await settle();

    expect(result.current.phase).toBe('start-failed');
    expect(result.current.errorMessage).toContain('Connection refused');
    expect(result.current.inputDisabled).toBe(true);
    expect(result.current.position).toBe(START_FEN);

    fake.onStart = () => Promise.resolve();
    act(() => {
      result.current.retry();
    });
    await settle();

    expect(result.current.phase).toBe('player-turn');
    expect(result.current.errorMessage).toBeNull();
  });

  it('shows engine timeouts, keeps the move, and retries the same request', async () => {
    const fake = new FakeClient();
    fake.onMove = () =>
      Promise.reject(
        new Error('Timed out after 10000 ms waiting for evaluation-complete'),
      );
    const { result } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();

    expect(result.current.phase).toBe('engine-failed');
    expect(result.current.errorMessage).toContain('Timed out');
    expect(pieceAt(result.current.position, 'e4')).toEqual({
      type: 'p',
      color: 'w',
    });

    fake.onMove = () => Promise.resolve({ move: 'e7e5' });
    act(() => {
      result.current.retry();
    });
    await settle();

    expect(result.current.phase).toBe('player-turn');
    expect(fake.requests).toEqual([
      { fen: FEN_AFTER_E4, level: 1 },
      { fen: FEN_AFTER_E4, level: 1 },
    ]);
    // A fresh session is opened right before the retried request.
    expect(fake.calls.slice(-2)).toEqual(['startSession', 'requestMove']);
    expect(pieceAt(result.current.position, 'e5')).toEqual({
      type: 'p',
      color: 'b',
    });
  });
});

describe('useComputerGame: leaving the game', () => {
  it('ignores a late engine reply after the game is abandoned', async () => {
    const fake = new FakeClient();
    const reply = deferred<EngineMove>();
    fake.onMove = () => reply.promise;
    const { result } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();
    const positionBeforeAbandon = result.current.position;

    act(() => {
      result.current.abandon();
    });
    expect(fake.calls).toContain('disconnect');
    expect(result.current.phase).toBe('abandoned');

    await act(async () => {
      reply.resolve({ move: 'e7e5' });
      await flushPromises();
    });

    expect(result.current.position).toBe(positionBeforeAbandon);
    expect(result.current.phase).toBe('abandoned');
    expect(play(result, 'd2', 'd4')).toBe(false);
  });

  it('disconnects the client when the screen unmounts', async () => {
    const fake = new FakeClient();
    const reply = deferred<EngineMove>();
    fake.onMove = () => reply.promise;
    const { result, unmount } = setup(fake);
    await settle();

    play(result, 'e2', 'e4');
    await settle();
    unmount();

    expect(fake.calls.filter((call) => call === 'disconnect')).toHaveLength(1);

    // A late reply after unmount must not throw.
    reply.resolve({ move: 'e7e5' });
    await flushPromises();
  });
});

describe('useComputerGame: game over', () => {
  it('stops after a checkmating player move and sends no request', async () => {
    const fake = new FakeClient();
    const { result } = setup(fake, {
      initialFen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    });
    await settle();

    expect(play(result, 'a1', 'a8')).toBe(true);
    await settle();

    expect(result.current.phase).toBe('game-over');
    expect(result.current.outcome).toBe('win');
    expect(result.current.inputDisabled).toBe(true);
    expect(fake.requests).toHaveLength(0);
  });

  it('reports a draw after a stalemating player move', async () => {
    const fake = new FakeClient();
    const { result } = setup(fake, {
      initialFen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1',
    });
    await settle();

    expect(play(result, 'h7', 'c7')).toBe(true);
    await settle();

    expect(result.current.phase).toBe('game-over');
    expect(result.current.outcome).toBe('draw');
    expect(fake.requests).toHaveLength(0);
  });

  it('stops after a checkmating engine reply and rejects further moves', async () => {
    const fake = new FakeClient();
    fake.onMove = () => Promise.resolve({ move: 'a8a1' });
    const { result } = setup(fake, {
      initialFen: 'r5k1/8/8/8/8/8/5PPP/6K1 w - - 0 1',
    });
    await settle();

    play(result, 'g1', 'h1');
    await settle();

    expect(result.current.phase).toBe('game-over');
    expect(result.current.outcome).toBe('lose');
    expect(play(result, 'f2', 'f3')).toBe(false);
    expect(fake.requests).toHaveLength(1);
  });
});

describe('useComputerGame: with the shared fake client', () => {
  it('plays an exchange against the fixture replies', async () => {
    const fake = createFakeStockfishClient();
    const { result } = renderHook(() =>
      useComputerGame({ createClient: () => fake }),
    );
    await settle();

    expect(play(result, 'e2', 'e4')).toBe(true);
    await settle();

    expect(fake.sessionsStarted).toBe(1);
    expect(fake.requests).toEqual([{ fen: FEN_AFTER_E4, level: 1 }]);
    expect(pieceAt(result.current.position, 'e5')).toEqual({
      type: 'p',
      color: 'b',
    });
    expect(result.current.phase).toBe('player-turn');
  });
});
