# Stockfish Socket Contract

The Socket.IO protocol between the mobile app and the Y STEM Stockfish server,
and how `src/features/play/services/StockfishClient.ts` uses it.

**Sources** (repository `YSTEM-LMS/react`, commit `1a5928e`):

- `stockfishServer/src/index.js`: server setup, CORS
- `stockfishServer/src/managers/socket.js`: event handlers
- `stockfishServer/src/managers/StockfishManager.js`: engine sessions and replies
- `react-ystemandchess/src/features/engine/PlayComputer.tsx`: the website's
  player-vs-computer client

Server behaviour that depends on `chess.js` was checked against the server's
locked version, `chess.js` 0.11.0. The mobile app uses `chess.js` 1.x.

## Quick start for the game screen

```ts
import { useStockfishClient } from '@/features/play/hooks/useStockfishClient';

const client = useStockfishClient(); // disconnects when the screen unmounts

await client.startSession();

// After the board has applied the player's move:
const { move } = await client.requestMove({
  fen: boardFenAfterPlayerMove,
  level,
});
// move: UCI string such as "e7e5" or "a2a1q", or null if the engine has no
// legal move. Apply it to the board yourself.
```

If `requestMove()` rejects, call `startSession()` again before the next
request (see [Recovery](#recovery)). Tests use
`createFakeStockfishClient()` instead (see [Test support](#test-support)).

## Connection

| Item       | Value                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| URL        | `env.stockfishSocketUrl` from `src/config/env.ts` (`EXPO_PUBLIC_STOCKFISH_SOCKET_URL`, local example `http://10.0.2.2:8080`) |
| Scheme     | HTTP/HTTPS, validated by the shared configuration. HTTPS is required outside development                                     |
| Versions   | Server `socket.io` ^4.8.1 · mobile `socket.io-client` ^4.8.4 (same major version)                                            |
| Transports | Server allows the defaults (polling and WebSocket). The website and mobile both use `['websocket']`                          |
| Namespace  | Default (`/`)                                                                                                                |
| CORS       | Applies to browsers only. Requests without an `Origin` header (native apps) are accepted                                     |

The client does no URL validation of its own. It uses the shared, already
validated `env.stockfishSocketUrl` (see [Environment configuration](environments.md)).
An HTTP/HTTPS address does not disable WebSocket: the client's
`transports: ['websocket']` option decides the transport.

Mobile sets `autoConnect: false` (lazy connection) and `reconnection: false`.
The server deletes the session when a socket disconnects, so an automatic
reconnect would leave the client without a session. Callers run
`startSession()` again instead.

## Request sequence

This is the sequence the mobile client implements. It matches the website.

| Question                                    | Answer                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How does a session start?                   | Connect, emit `start-session`, wait for `session-started`. `startSession()` does all three. One session per socket                                                                          |
| Position before or after the player's move? | **After.** `fen` is the board's position after the player's move, with the engine to move                                                                                                   |
| How is the player's move represented?       | It is not sent. It is already part of `fen`, and the client always sends `move: ''`, so the server cannot apply it a second time                                                            |
| How are promotions represented?             | Player promotions are already on the board in `fen`. Engine promotions arrive as UCI with a lowercase piece: `e7e8q`, `a2a1n`                                                               |
| How are difficulty levels 1–5 interpreted?  | As Stockfish **search depth**: level 3 is `go depth 3`. Sent unchanged. All five levels are shallow searches (the website uses depths 1, 5, 10, 15, 20)                                     |
| Which reply fields are safe to use?         | Only `move`. The client validates `mode: 'move'` and `move`, checks that `move` is legal in `fen`, and returns `{ move }`. `newFEN` and `moveDetails` are ignored (see [Caveats](#caveats)) |

The screen applies the player's move, sends the resulting `fen`, then applies
the engine's `move`. The board is the only source of truth for the position.

The screen's difficulty names (`beginner`, `easy`, `medium`, `hard`, `master`)
are not mapped to levels yet. The obvious mapping is 1 to 5 in that order; the
screen integration should confirm it.

### Worked example

Exported as `stockfishWorkedExample` from
`src/features/play/services/stockfishFixtures.ts` and checked by
`test/stockfishFixtures.test.ts`. The engine's reply is chosen for the example,
not recorded from a live server.

1. Starting position, the player (White) to move:
   `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`
2. The player plays `e2e4` (1. e4). The board now shows:
   `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1`
3. The screen calls:

   ```ts
   client.requestMove({
     fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
     level: 3,
   });
   ```

4. The client emits `evaluate-fen`:

   ```json
   {
     "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
     "move": "",
     "level": 3
   }
   ```

   The server runs `position fen <fen>` and `go depth 3`.

5. The server replies with `evaluation-complete`:

   ```json
   {
     "mode": "move",
     "move": "e7e5",
     "moveDetails": {
       "color": "b",
       "from": "e7",
       "to": "e5",
       "flags": "b",
       "piece": "p",
       "san": "e5"
     },
     "newFEN": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
   }
   ```

6. `requestMove()` resolves with `{ move: 'e7e5' }`. The board applies it:
   `rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2`

(The en passant field differs from `newFEN` because chess.js 1.x only records
it when a capture is possible. This is one more reason not to use `newFEN`.)

## Session lifecycle

1. Client connects.
2. Client emits `start-session`. The server spawns one Stockfish process for
   this socket.
3. Client emits `evaluate-fen` as many times as needed, **one at a time**.
4. Client emits `end-session` or disconnects. The server kills the process.

- One session per socket. A second `start-session` on the same socket returns
  `session-error` with `"Session already exists!"`.
- Disconnecting deletes the session. Reconnecting requires a new
  `start-session`.
- Leaving the game screen must disconnect. `useStockfishClient()` calls
  `disconnect()` on unmount.

## Client → server events

### `start-session`

```ts
{ sessionType: 'player-vs-computer', fen: <standard starting FEN> }
```

- `sessionType` is stored but does not change engine behaviour.
- `fen` sets the session's initial position, which is never searched: every
  `evaluate-fen` reloads the position from its own `fen`. Mobile sends the
  standard starting FEN, as the website does. (The server's chess.js 0.11
  silently ignores an invalid FEN such as `'start'`.)

Replies:

- success: `session-started` with `{ success: true, id: string }` (`id` is the
  socket ID)
- failure: `session-error` with `{ error: string }`

If the Stockfish binary fails to launch, the server emits `session-error`
(`"Chess engine failed to start"`) **after** `session-started` has already
been sent. The mobile client listens for `session-error` from the moment it
sends `start-session` until the session ends, and invalidates the session when
it arrives (see [Recovery](#recovery)). If `session-error` arrives right after
`session-started`, before `startSession()` has resolved, `startSession()`
rejects with that error instead of reporting success.

### `evaluate-fen`

```ts
{ fen: string, move: string, level: number }
```

| Field   | Server meaning                                                                                                                                     | Mobile sends                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `fen`   | Position to evaluate. Not validated by the server                                                                                                  | Position after the player's move     |
| `move`  | Moves to apply first, in UCI, passed to the engine as `position fen <fen> moves <move>`. Must be a string: a missing `move` makes the server throw | Always `''`                          |
| `level` | Search depth (`go depth <level>`), capped at 30, no lower bound                                                                                    | Difficulty 1–5, validated, unchanged |

Replies: `evaluation-complete` or `evaluation-error` (below). Without a
session: `evaluation-error` with `"Session not found!"`.

The client validates `fen` with chess.js before sending. The server does not
validate it, and Stockfish's behaviour on an invalid FEN is undefined (it may
crash, and the server does not report an engine exit), which would surface
only as a timeout.

### Other events (not used by the mobile client)

| Event         | Payload           | Reply                                                                             |
| ------------- | ----------------- | --------------------------------------------------------------------------------- |
| `update-fen`  | `{ fen: string }` | None on success. `update-error` with `{ err: string }` (note: `err`, not `error`) |
| `end-session` | none              | `session-ended` with `{ success: true }`                                          |

## Server → client events

### `evaluation-complete`

Sessions started through `start-session` are always in **move mode**:

```ts
{
  mode: 'move',
  move: string,              // engine's best move, UCI, e.g. "e7e5"
  moveDetails: object | null,
  newFEN: string,
}
```

`moveDetails` is a chess.js 0.11 move object, or `null` if chess.js could not
apply the move:

```ts
{ color: 'w' | 'b', from: string, to: string, flags: string, piece: string,
  san: string, captured?: string, promotion?: string }
```

An info-mode shape, `{ mode: 'info', output: string[] }`, exists for
server-internal analysis sessions. `start-session` cannot enable it.

#### Caveats

- **`newFEN` and `moveDetails` are wrong when `move` is not empty.** The engine
  searches from `fen` + `move`, but the server applies the engine's reply to
  `fen` alone. The reply is then illegal, chess.js 0.11 returns `null` without
  throwing, `moveDetails` is `null`, and `newFEN` equals the request's `fen`
  (neither move applied). The `move` field itself is still correct. Mobile
  always sends `move: ''`, so this does not occur, but `newFEN` and
  `moveDetails` are still ignored: the board applies `move` itself.
- **No legal moves.** In checkmate or stalemate, Stockfish answers
  `bestmove (none)`. This arrives as `evaluation-complete` with
  `move: '(none)'` and `moveDetails: null`, not as `evaluation-error`. The
  mobile client returns `{ move: null }` for it, never `'(none)'`, and only
  when the position really has no legal moves.

### `evaluation-error`

Payload: `{ error: string }`, e.g. `"Session not found!"` or
`"Invalid move from engine"`.

### `session-started`, `session-error`, `session-ended`

See [Session lifecycle](#session-lifecycle) and the event tables above.

## Request matching

Replies carry no request ID. The server keeps one pending evaluation per
session, and a new `evaluate-fen` resets the previous one. The mobile client
therefore:

- allows only one request at a time and rejects a second call while the first
  is pending (`"A move request is already in progress."`);
- removes its listeners as soon as a request settles, so a reply that arrives
  later resolves nothing;
- checks that the reply is a legal move in the requested position. A stray
  reply meant for another position is almost always illegal there and is
  rejected instead of reaching the board;
- abandons the socket after any failed request (below), so a late reply to a
  failed request cannot be matched to the next one.

A stray reply that happens to be legal in the new position cannot be
detected. The rules above make this unlikely: there is never more than one
request on a socket that has not failed.

## Recovery

The client **resets** (closes the socket, forgets the session, and rejects
anything still pending) when:

| Situation                                                                             | Why                                                                                                   |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `requestMove()` times out                                                             | A late `evaluation-complete` would otherwise resolve the next request                                 |
| `requestMove()` gets `evaluation-error`, `disconnect`, or an invalid or illegal reply | The server may be out of step (e.g. `"Session not found!"`), and a late reply may still arrive        |
| `session-error` arrives after `session-started`                                       | The session is unusable (e.g. the engine failed to launch)                                            |
| `startSession()` fails (timeout, `session-error`, invalid)                            | The server may still hold a session on that socket, so a retry there gets `"Session already exists!"` |
| `startSession()` finds the connection dropped                                         | The server deleted the session on disconnect                                                          |

Errors found before anything is sent (invalid level or FEN, no session, a
request already pending) do **not** reset the session.

**Recovery procedure for callers:** when `requestMove()` rejects, call
`startSession()` (it opens a fresh socket and session), then send the same
request again with the board's current FEN. Nothing on the board changes on
failure, so the retry is safe. If `startSession()` also fails, show an error
and let the player retry.

## How the mobile client uses this contract

| Client method    | Emits                                          | Resolves on                                       | Rejects on                                                                                                                                     |
| ---------------- | ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `startSession()` | `start-session` (after a lazy connect)         | `session-started` (validated)                     | `connect_error`, `session-error`, `disconnect`, timeout                                                                                        |
| `requestMove()`  | `evaluate-fen` with `{ fen, move: '', level }` | `evaluation-complete` (validated, legal in `fen`) | invalid level or FEN, no session, request already pending, invalid or illegal move, `evaluation-error`, `session-error`, `disconnect`, timeout |
| `disconnect()`   | none (closes the socket)                       | n/a                                               | Rejects anything still pending and removes all listeners                                                                                       |

- Each reply has a 10 second timeout (`timeoutMs`).
- `requestMove()` resolves with `{ move }` only. Callers apply the move to
  their own board.
- `move` is a UCI move (`e7e5`), castling as the king's move (`e8g8`), or a
  promotion (`e7e8q`, `e2e1n`; pieces `q`, `r`, `b`, `n`, lowercase). It is
  `null` when the engine has no legal move.
- Errors are `StockfishClientError` with a readable message.
- Screens never touch the socket. They use the `StockfishClient` interface.

## Test support

Screen tests should not open sockets. Use the fake client:

```ts
import { useStockfishClient } from '@/features/play/hooks/useStockfishClient';
import { createFakeStockfishClient } from '@/features/play/services/fakeStockfishClient';

const fake = createFakeStockfishClient({
  replies: { [fenAfterPlayerMove]: 'e7e5' }, // optional
  delayMs: 300, // optional engine thinking time
  // moveError / startError: optional failures to test error UI
});
// Inject it, e.g. useStockfishClient(() => fake).
```

`createFakeStockfishClient()` (`src/features/play/services/fakeStockfishClient.ts`):

- follows the real contract: needs `startSession()`, validates FEN and level,
  allows one request at a time, ends the session after a failure or
  `disconnect()`, and rejects a pending request on `disconnect()`;
- answers the fixture positions by default, and any other position with
  chess.js's first legal move, so results are deterministic;
- refuses to return an illegal custom reply;
- records `requests`, `sessionsStarted`, `disconnectCalls`, and `hasSession`
  for assertions.

`src/features/play/services/stockfishFixtures.ts` provides the worked example,
`engineReplyFixtures` (ordinary moves, castling, engine promotions, a reply
after a player promotion, checkmate, and stalemate), and
`evaluationCompletePayload(fen, move)` to build server replies. Every fixture
position and move is checked for legality in `test/stockfishFixtures.test.ts`.

Tests of the client itself use `test/mocks/FakeSocket.ts`, which stands in for
the Socket.IO socket.

## Server limitations

These are server-side and are documented, not worked around (the server is
out of scope):

- **No request IDs**: see [Request matching](#request-matching).
- **No FEN validation and no engine-exit handling**: an engine that dies
  mid-search produces no reply, only a client timeout.
- **`session-error` can follow `session-started`** when the engine fails to
  launch.
- **`newFEN` is wrong when `move` is not empty**: see [Caveats](#caveats).
- **Authentication: none.** The server has no handshake auth or tokens. Anyone
  who can reach the URL can open sessions. The mobile client sends no
  credentials.
- **Rate limits: none on the socket.** `express-rate-limit` is listed in the
  server's `package.json` but is not applied. Each session spawns a Stockfish
  process, so connection or session limits are an open server-side question.
- **Staging and production URLs** for the Stockfish server are not yet
  provided.

## Verification

All behaviour above is covered by unit tests against `FakeSocket` and the
fake client. It has **not** been verified against a running local or staging
Stockfish server: no staging URL exists yet, and the server was not run
locally for this work. The worked example's engine reply is illustrative.
