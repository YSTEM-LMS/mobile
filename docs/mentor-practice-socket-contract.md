# Mentor Practice Socket Contract

How a signed-in student and their mentor play one practice game through the
live chess server's `newgame` flow, and the `MentorPracticeClient` interface
the practice screen uses.

**Status:** the interface, the fake client, and the fixtures are ready. The
real Socket.IO client is not implemented yet, so build and test the screen
against `createFakeMentorPracticeClient()`.

**Sources** (repository `YSTEM-LMS/react`, commit `cc637f91`):

- `chessServer/src/managers/EventHandlers.js`: socket event handlers
- `chessServer/src/managers/GameManager.js`: games, pairing, and moves
- `chessServer/src/index.js`: server setup, CORS

The server locks `chess.js` 1.4.0, the same version the mobile app uses, so
the fake client checks moves exactly as the server does.

| File                                                     | Contents                               |
| -------------------------------------------------------- | -------------------------------------- |
| `src/features/play/services/MentorPracticeClient.ts`     | The interface, events, and error class |
| `src/features/play/services/fakeMentorPracticeClient.ts` | Deterministic fake for screen tests    |
| `src/features/play/services/mentorPracticeFixtures.ts`   | The worked example and test positions  |

## Interface

```ts
interface MentorPracticeClient {
  join(pair: PracticePair): Promise<PracticeJoinResult>; // { fen, color }
  sendMove(move: PracticeMove): void; // { from, to }
  subscribe(listener: (event: PracticeEvent) => void): () => void;
  leave(): void;
}

type PracticeEvent =
  | { type: 'board'; fen: string }
  | { type: 'move-rejected'; message: string }
  | {
      type: 'game-over';
      reason: 'checkmate' | 'draw';
      winner?: string;
      loser?: string;
    }
  | { type: 'ended' };
```

`PracticePair` is `{ student, mentor, role }`: both usernames, and which of
the two this device is. For now the screen receives the pair as a prop. The
partner's username will come from `GET /user/getMentorship`.

## Rules for the screen

The server leaves these to the client:

1. **Color comes from `join()`.** The server gives the first player to join
   black, whatever their role. Never derive color from the role.
2. **Only allow moves on this device's turn.** The server accepts a move from
   either device for whichever side is to move.
3. **Disable promotion.** The server drops the promotion piece, so every
   promoting move comes back as `move-rejected`.
4. **Treat `ended` as final.** If either player leaves or disconnects, the
   server deletes the game for both. Nothing resumes; show a "session ended"
   state. A new `join()` starts a new game.
5. **Call `leave()` when the screen unmounts.**
6. **Show "waiting for your partner" whenever it is not this device's turn.**
   The server never says when the partner joins. That is not a problem: the
   first player to join is black, so they are waiting for White either way.
7. **Apply positions from `board` events only.** The server sends this
   device's own move back as a `board` event, so the board does not need to
   apply moves itself.

Practice games are not saved: no results, ratings, or history.

## Worked example

The `usePracticeGame` hook below covers the whole lifecycle: join, events,
turn gating, and cleanup. It was checked with the fake client in all three
screen states (playing, join failed, ended).

```tsx
import { Chess } from 'chess.js';
import { useEffect, useState } from 'react';

import type {
  MentorPracticeClient,
  PracticeColor,
  PracticeEvent,
  PracticePair,
} from '@/features/play/services/MentorPracticeClient';

type GameOver = Extract<PracticeEvent, { type: 'game-over' }>;

export type PracticeGameState =
  | { status: 'joining' }
  | { status: 'join-failed'; message: string }
  | {
      status: 'playing';
      fen: string;
      color: PracticeColor;
      rejection?: string;
      gameOver?: GameOver;
    }
  | { status: 'ended' };

export function usePracticeGame(
  client: MentorPracticeClient,
  pair: PracticePair,
) {
  const [state, setState] = useState<PracticeGameState>({ status: 'joining' });
  const { student, mentor, role } = pair;

  useEffect(() => {
    let active = true;

    // Subscribe before joining so no event is missed.
    const unsubscribe = client.subscribe((event) => {
      if (event.type === 'ended') {
        setState({ status: 'ended' });
        return;
      }
      setState((current) => {
        if (current.status !== 'playing') return current;
        if (event.type === 'board') {
          return { ...current, fen: event.fen, rejection: undefined };
        }
        if (event.type === 'move-rejected') {
          return { ...current, rejection: event.message };
        }
        return { ...current, gameOver: event };
      });
    });

    client.join({ student, mentor, role }).then(
      ({ fen, color }) => {
        if (active) setState({ status: 'playing', fen, color });
      },
      (error: unknown) => {
        if (active) {
          const message =
            error instanceof Error ? error.message : String(error);
          setState({ status: 'join-failed', message });
        }
      },
    );

    // Runs on unmount: stop listening, end the game, disconnect.
    return () => {
      active = false;
      unsubscribe();
      client.leave();
    };
  }, [client, student, mentor, role]);

  // The server accepts moves from either device, so gate them here.
  const isMyTurn =
    state.status === 'playing' &&
    !state.gameOver &&
    new Chess(state.fen).turn() === state.color[0];

  function sendMove(from: string, to: string) {
    if (isMyTurn) client.sendMove({ from, to });
  }

  return { state, isMyTurn, sendMove };
}
```

### What travels over the socket

`mentorPracticeWorkedExample` in the fixtures records one session between
the seeded demo accounts `student` and `mentor`. Every payload is a JSON
string on the wire.

| Step | Device  | Sends                                                                | Receives                                                   |
| ---- | ------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Mentor  | `newgame` `{"student":"student","mentor":"mentor","role":"mentor"}`  | `boardstate` with the start position and `"color":"black"` |
| 2    | Student | `newgame` `{"student":"student","mentor":"mentor","role":"student"}` | `boardstate` with the start position and `"color":"white"` |
| 3    | Student | `move` `{"from":"e2","to":"e4"}`                                     | —                                                          |
| 4    | Both    | —                                                                    | `boardstate` with the position after 1. e4, no color       |

The mentor gets nothing at step 2. Step 4 reaches both devices as
`{ type: 'board', fen }`.

## Testing with the fake

```ts
import { act, renderHook } from '@testing-library/react-native';

import { createFakeMentorPracticeClient } from '@/features/play/services/fakeMentorPracticeClient';

const pair = { student: 'student', mentor: 'mentor', role: 'mentor' } as const;

it('waits for the partner, then gets their move', async () => {
  // The mentor joined first, so the server gave them black.
  const client = createFakeMentorPracticeClient({ color: 'black' });
  const { result, unmount } = renderHook(() => usePracticeGame(client, pair));

  await act(async () => {});
  expect(result.current.isMyTurn).toBe(false);

  await act(async () => {
    client.partnerMove({ from: 'e2', to: 'e4' });
  });
  expect(result.current.isMyTurn).toBe(true);

  unmount();
  expect(client.leaveCalls).toBe(1);
  expect(client.listenerCount).toBe(0);
});
```

Events arrive asynchronously, like network replies, so wrap anything that
triggers them in `await act(async () => { ... })`.

| To test             | Use                                                                                |
| ------------------- | ---------------------------------------------------------------------------------- |
| This device's color | `createFakeMentorPracticeClient({ color: 'black' })` (default `'white'`)           |
| The partner moving  | `client.partnerMove({ from, to })`                                                 |
| A rejected move     | `client.sendMove()` with an illegal move, or `practicePositions.promotionRejected` |
| Checkmate           | `startingFen: practicePositions.whiteMatesInOne.fen`, then play its `move`         |
| A draw              | `startingFen: practicePositions.whiteStalematesInOne.fen`, then its `move`         |
| A failed join       | `createFakeMentorPracticeClient({ joinError: new Error('...') })`                  |
| A slow join         | `joinDelayMs` with Jest fake timers                                                |
| The partner leaving | `client.endSession()`                                                              |
| Cleanup             | `client.leaveCalls`, `client.listenerCount`                                        |

The fake also exposes `status`, `fen`, `pair`, `joinCalls`, and `sentMoves`.
