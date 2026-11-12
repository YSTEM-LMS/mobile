import { createFakeStockfishClient } from '@/features/play/services/fakeStockfishClient';
import { StockfishClientError } from '@/features/play/services/StockfishClient';
import {
  engineReplyFixtures,
  stockfishWorkedExample,
} from '@/features/play/services/stockfishFixtures';

const REQUEST = stockfishWorkedExample.request;

afterEach(() => {
  jest.useRealTimers();
});

describe('createFakeStockfishClient', () => {
  it('answers the worked example with its engine move', async () => {
    const client = createFakeStockfishClient();
    await client.startSession();

    await expect(client.requestMove(REQUEST)).resolves.toEqual(
      stockfishWorkedExample.engineMove,
    );
    expect(client.requests).toEqual([REQUEST]);
  });

  it.each(engineReplyFixtures)(
    'answers fixture positions by default: $name',
    async ({ fen, move }) => {
      const client = createFakeStockfishClient();
      await client.startSession();

      await expect(client.requestMove({ fen, level: 1 })).resolves.toEqual({
        move,
      });
    },
  );

  it('answers other positions with a deterministic legal move', async () => {
    const client = createFakeStockfishClient();
    await client.startSession();
    const fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';

    const first = await client.requestMove({ fen, level: 1 });
    const second = await client.requestMove({ fen, level: 5 });

    expect(first.move).toMatch(/^[a-h][1-8][a-h][1-8]$/);
    expect(second).toEqual(first);
  });

  it('uses custom replies', async () => {
    const client = createFakeStockfishClient({
      replies: { [REQUEST.fen]: 'c7c5' },
    });
    await client.startSession();

    await expect(client.requestMove(REQUEST)).resolves.toEqual({
      move: 'c7c5',
    });
  });

  it('rejects an illegal custom reply instead of returning it', async () => {
    const client = createFakeStockfishClient({
      replies: { [REQUEST.fen]: 'e2e4' },
    });
    await client.startSession();

    await expect(client.requestMove(REQUEST)).rejects.toThrow('not legal');
  });

  it('requires a session, like the real client', async () => {
    const client = createFakeStockfishClient();

    await expect(client.requestMove(REQUEST)).rejects.toThrow(
      'Call startSession()',
    );
    expect(client.requests).toHaveLength(0);
  });

  it('rejects invalid positions and levels before recording a request', async () => {
    const client = createFakeStockfishClient();
    await client.startSession();

    await expect(
      client.requestMove({ fen: 'start', level: 3 }),
    ).rejects.toThrow('Invalid position');
    await expect(
      client.requestMove({ ...REQUEST, level: 9 as 1 }),
    ).rejects.toThrow('Difficulty level');
    expect(client.requests).toHaveLength(0);
    expect(client.hasSession).toBe(true);
  });

  it('allows one request at a time', async () => {
    const client = createFakeStockfishClient();
    await client.startSession();

    const first = client.requestMove(REQUEST);
    await expect(client.requestMove(REQUEST)).rejects.toThrow(
      'already in progress',
    );
    await expect(first).resolves.toEqual({ move: 'e7e5' });
  });

  it('simulates engine thinking time', async () => {
    jest.useFakeTimers();
    const client = createFakeStockfishClient({ delayMs: 500 });
    await client.startSession();

    const onReply = jest.fn();
    const result = client.requestMove(REQUEST).then(onReply);

    await jest.advanceTimersByTimeAsync(499);
    expect(onReply).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await result;
    expect(onReply).toHaveBeenCalledWith({ move: 'e7e5' });
  });

  it('rejects a pending request on disconnect and ends the session', async () => {
    jest.useFakeTimers();
    const client = createFakeStockfishClient({ delayMs: 500 });
    await client.startSession();

    const result = client.requestMove(REQUEST);
    client.disconnect();

    await expect(result).rejects.toThrow('disconnected');
    expect(client.hasSession).toBe(false);
    expect(client.disconnectCalls).toBe(1);
    await expect(client.requestMove(REQUEST)).rejects.toThrow(
      'Call startSession()',
    );
  });

  it('simulates failures and ends the session after a failed move', async () => {
    const moveError = new StockfishClientError('Timed out');
    const client = createFakeStockfishClient({ moveError });
    await client.startSession();

    await expect(client.requestMove(REQUEST)).rejects.toBe(moveError);
    expect(client.hasSession).toBe(false);

    await client.startSession();
    expect(client.sessionsStarted).toBe(2);
  });

  it('simulates a server that cannot start a session', async () => {
    const startError = new StockfishClientError('Stockfish connect_error');
    const client = createFakeStockfishClient({ startError });

    await expect(client.startSession()).rejects.toBe(startError);
    expect(client.hasSession).toBe(false);
  });
});
