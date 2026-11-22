# Mentor Practice Socket Contract

How a signed-in student and their mentor play one practice game through the
live chess server's `newgame` flow, and the `MentorPracticeClient` interface
the practice screen uses.

**Status:** the interface, the fake client, the fixtures, and the real
Socket.IO client are ready. The real client passed a two-client run against
the full backend running locally (see [Verification](#verification)). There
is no staging server yet. Two issues on the chess server block beta use; see
[Beta blockers](#beta-blockers).

**Sources** (repository `YSTEM-LMS/react`, commit `702e729`, `main` on
2026-11-18):

- `chessServer/src/managers/EventHandlers.js`: socket event handlers
- `chessServer/src/managers/GameManager.js`: games, pairing, and moves
- `chessServer/src/index.js`: server setup, CORS

The server locks `chess.js` 1.4.0, the same version the mobile app uses, so
the fake client checks moves exactly as the server does.

| File                                                       | Contents                               |
| ---------------------------------------------------------- | -------------------------------------- |
| `src/features/play/services/MentorPracticeClient.ts`       | The interface, events, and error class |
| `src/features/play/services/mentorPracticeSocketClient.ts` | The real Socket.IO client              |
| `src/features/play/services/fakeMentorPracticeClient.ts`   | Deterministic fake for screen tests    |
| `src/features/play/services/mentorPracticeFixtures.ts`     | The worked example and test positions  |
| `test/mentorPracticeLive.test.ts`                          | Opt-in run against a live chess server |

## Interface

```ts
interface MentorPracticeClient {
  join(pair: PracticePair): Promise<PracticeJoinResult>; // { fen, color }
  sendMove(move: PracticeMove): void; // { from, to, promotion? }
  subscribe(listener: (event: PracticeEvent) => void): () => void;
  leave(): void;
}

type PracticeEvent =
  | { type: 'board'; fen: string }
  | { type: 'move-rejected'; message: string }
  | {
      type: 'game-over';
      reason: 'checkmate' | 'draw' | 'resign';
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
3. **Promotion is always to a queen; no picker is needed.** The client sends
   `promotion: 'q'` with every move, like the website's client (chess.js
   ignores it on a move that does not promote). Pass `promotion` only to
   underpromote. **The server does not apply it yet:** `makeMove` in
   `chessServer/src/managers/GameManager.js` passes only `from` and `to` to
   chess.js (still true on `react` `main` at `702e729`), so promoting moves
   come back as `move-rejected` until the server passes the piece through.
   Show the rejection; do not block the move on the board.
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

Practice games are not saved: no results, ratings, or history. The server
reports results only for student-vs-student games (`emitGameOver` checks
`game.isPvp`), and a disconnect in a practice game ends it without a result.

## The real client

```ts
import { createMentorPracticeClient } from '@/features/play/services/mentorPracticeSocketClient';

// One client per mounted screen.
const [client] = useState(() => createMentorPracticeClient());
const { state, isMyTurn, sendMove } = usePracticeGame(client, pair);
```

It connects to `EXPO_PUBLIC_CHESS_SOCKET_URL` (`env.chessSocketUrl`). The
options `url`, `createSocket`, and `timeoutMs` (default 10 seconds) are for
tests. Each `join()` opens its own WebSocket and connects only then. The
client can join again after `leave()` or `ended`, so React's development
remount works.

| Server sends                         | The client                                           |
| ------------------------------------ | ---------------------------------------------------- |
| `boardstate` with `color` (join)     | Resolves `join()` with `{ fen, color }`              |
| `boardstate` (after a move)          | Emits `board`                                        |
| `error` (a move failed)              | Emits `move-rejected` with the server's message      |
| `gameover`                           | Emits `game-over` (`winnerUsername` → `winner`, ...) |
| `reset` (the partner left)           | Emits `ended` and closes the socket                  |
| Connection lost                      | Emits `ended`                                        |
| `gameerror`, connect error, no reply | `join()` rejects with `MentorPracticeClientError`    |

- **Leaving.** `leave()` removes every listener and closes the socket. The
  server's disconnect handler deletes the game and sends `reset` to the
  partner, who gets `ended`. The client's own disconnect is not reported as
  `ended`.
- **No reconnection.** The server deletes the game when the socket drops, so
  the client does not reconnect. The screen shows the ended state instead.
- **Untrusted payloads.** Every payload is checked (valid FEN, known color and
  reason). A bad join reply rejects `join()`; a bad payload during a game emits
  `ended`, because the board can no longer be trusted.
- **Resignation.** The server's `resign` event works in practice games and
  sends `gameover` with `reason: 'resign'`. No current client sends it, but the
  screen should handle it like a checkmate.

## Verification

There is no staging server yet, so the client is verified against the
backend running locally.

**Local, 2026-11-21.** MongoDB, the middleware, and the chess server from
`react` `main` at `ef2c744a` (which includes `702e729`) ran on `localhost`
through the repository's `docker-compose.yml`, with `NODE_ENV=development`.
`npm run seed:dev` created the paired demo accounts `student` and `mentor`,
and both signed in through `/auth/login`. `test/mentorPracticeLive.test.ts`
then played the worked example with two real clients:

1. The mentor joined and got black at the start position.
2. The student joined the same pair and got white.
3. The student sent e2→e5; only the student got `move-rejected` with
   `Invalid move: {"from":"e2","to":"e5"}`.
4. The student sent e2→e4 (with `promotion: 'q'`); both clients got the same
   `board` event with the position after 1. e4.
5. The mentor left; the student got `ended`.

The chess server log matched each step. `newgame` checks no login, so the
test uses generated usernames rather than the demo accounts.

To run the same check against a local or future staging server:

```sh
MENTOR_PRACTICE_LIVE_URL=http://localhost:3001 npx jest test/mentorPracticeLive.test.ts
```

The test is skipped when the variable is not set, so CI does not need a
server.

**Local setup note.** Under Docker Desktop on Windows, the middleware can fail
to start: in development it gives MongoDB only 1000 ms to connect
(`serverSelectionTimeoutMS` in `middlewareNode/src/config/db.js`), and its
in-memory fallback package is not in the Docker image. Raising that timeout
locally fixes it.

**Not yet verified on two devices.** The issue also asks for the demo student
and mentor to play on two devices. That run is blocked by tooling, not by the
client:

- The project uses Expo SDK 57, and the current Expo Go from the app stores
  runs only SDK 58. The Expo CLI can install a matching Expo Go on an Android
  device or emulator, but an iPhone can get only the App Store version, so it
  cannot open the app in Expo Go. Upgrading `expo` alone breaks the build and
  tests; a full SDK 58 upgrade is separate work.
- Two Android emulators alongside the local backend need more than 16 GB of
  RAM.
- Campus Wi-Fi such as eduroam blocks phones from reaching a laptop on the
  same network. Use USB with `adb reverse` or a phone hotspot instead.

Two Android devices over USB (or one device and one emulator on a machine
with more RAM) can run it today.

## Beta blockers

Both are chess server issues. The client is complete for each; neither
blocks local demo testing.

| Blocker       | Owner                                     | Detail                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization | Chess server team (owner being confirmed) | `newgame` checks no identity: anyone who knows the two usernames can take a seat. Puzzle joins already verify the mentor through the middleware (`verifyMentorPairing`) and PvP joins through `/challenge/game/:id`; `newgame` needs the same check before beta users get the real flow.     |
| Promotion     | Chess server team                         | Known backend limitation. The client sends `promotion: 'q'` with every move, but `makeMove` passes only `from` and `to` to chess.js, so promoting moves are rejected as illegal. No server fix exists or is deployed. Fix: read `promotion` in the `move` handler and pass it to `makeMove`. |

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
| 3    | Student | `move` `{"from":"e2","to":"e4","promotion":"q"}`                     | —                                                          |
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
| A fixed server      | `serverAppliesPromotion: true`; `promotionRejected` then reaches `fenAfterQueen`   |
| Checkmate           | `startingFen: practicePositions.whiteMatesInOne.fen`, then play its `move`         |
| A draw              | `startingFen: practicePositions.whiteStalematesInOne.fen`, then its `move`         |
| A failed join       | `createFakeMentorPracticeClient({ joinError: new Error('...') })`                  |
| A slow join         | `joinDelayMs` with Jest fake timers                                                |
| The partner leaving | `client.endSession()`                                                              |
| Cleanup             | `client.leaveCalls`, `client.listenerCount`                                        |

The fake also exposes `status`, `fen`, `pair`, `joinCalls`, and `sentMoves`.
