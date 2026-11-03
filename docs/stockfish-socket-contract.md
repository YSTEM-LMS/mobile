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
locked version, `chess.js` 0.11.0.

## Connection

| Item       | Value                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| URL        | `EXPO_PUBLIC_STOCKFISH_SOCKET_URL` (local default `http://10.0.2.2:8080`; server `PORT` defaults to `8080`) |
| Versions   | Server `socket.io` ^4.8.1 · mobile `socket.io-client` ^4.8.4 (same major version)                           |
| Transports | Server allows the defaults (polling and WebSocket). The website and mobile both use `['websocket']`         |
| Namespace  | Default (`/`)                                                                                               |
| CORS       | Applies to browsers only. Requests without an `Origin` header (native apps) are accepted                    |

Mobile sets `autoConnect: false` (lazy connection) and `reconnection: false`.
The server deletes the session when a socket disconnects, so an automatic
reconnect would leave the client without a session. Callers run
`startSession()` again instead.

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

## Client → server events

### `start-session`

```ts
{ sessionType: 'player-vs-computer', fen: 'start' }
```

- `sessionType` is stored but does not change engine behaviour.
- `fen` sets the session's initial position.
- **`'start'` is not a valid FEN.** chess.js 0.11 ignores it without an error
  and leaves an empty board. This is harmless, because every `evaluate-fen`
  reloads the position from its own `fen`. The website sends a full FEN
  instead.

Replies:

- success: `session-started` with `{ success: true, id: string }` (`id` is the
  socket ID)
- failure: `session-error` with `{ error: string }`

If the Stockfish binary fails to launch, the server emits `session-error`
(`"Chess engine failed to start"`) **after** `session-started` has already
been sent. The mobile client keeps listening for `session-error` while a
session is in use and invalidates the session when it arrives (see
[Recovery](#recovery)).

### `evaluate-fen`

```ts
{ fen: string, move: string, level: 1 | 2 | 3 | 4 | 5 }
```

| Field   | Meaning                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fen`   | Position to evaluate                                                                                                                                                                              |
| `move`  | Optional move to apply first, in **UCI** format (`e2e4`, promotions like `e7e8q`). Space-separated lists are passed through to the engine. Send `''` for none                                     |
| `level` | Engine **search depth** (`go depth <level>`). Mobile sends difficulty 1–5 directly (confirmed by the team). The server accepts up to 30 and has no lower bound. The website uses 1, 5, 10, 15, 20 |

Replies: `evaluation-complete` or `evaluation-error` (below). Without a
session: `evaluation-error` with `"Session not found!"`.

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

Example. Request `{ fen: <position after 1. e4>, move: '', level: 3 }`, reply:

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

An info-mode shape, `{ mode: 'info', output: string[] }`, exists for
server-internal analysis sessions. `start-session` cannot enable it.

#### Caveats

- **`newFEN` and `moveDetails` are wrong when `move` is not empty.** The engine
  searches from `fen` + `move`, but the server applies the engine's reply to
  `fen` alone. The reply is then illegal, chess.js 0.11 returns `null` without
  throwing, `moveDetails` is `null`, and `newFEN` equals the request's `fen`
  (neither move applied). The `move` field itself is still correct. The website
  avoids this by sending the position **after** the player's move with
  `move: ''`, and it applies the engine's `move` locally, ignoring `newFEN`.
  **Decision (team):** the mobile client returns only `move`. Callers apply it
  to their own board, and `newFEN` and `moveDetails` are ignored.
- **No legal moves.** In checkmate or stalemate, Stockfish answers
  `bestmove (none)`. This arrives as `evaluation-complete` with
  `move: '(none)'` and `moveDetails: null`, not as `evaluation-error`. The
  mobile client returns `{ move: null }` for it, never `'(none)'`.

### `evaluation-error`

Payload: `{ error: string }`, e.g. `"Session not found!"` or
`"Invalid move from engine"`.

### `session-started`, `session-error`, `session-ended`

See [Session lifecycle](#session-lifecycle) and the event tables above.

## Request matching

Replies carry no request ID. The server keeps one pending evaluation per
session, and a new `evaluate-fen` resets the previous one. The mobile client
therefore allows only one request at a time and rejects a second call while
the first is pending.

A request that times out may still be answered later, and that late reply
would look like the answer to the next request. The client therefore abandons
the socket on a timeout (see [Recovery](#recovery)).

## Recovery

The client **resets** (closes the socket, forgets the session, and rejects
anything still pending) when:

| Situation                                                  | Why                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `requestMove()` times out                                  | A late `evaluation-complete` would otherwise resolve the next request                                 |
| `session-error` arrives after `session-started`            | The session is unusable (e.g. the engine failed to launch)                                            |
| `startSession()` fails (timeout, `session-error`, invalid) | The server may still hold a session on that socket, so a retry there gets `"Session already exists!"` |
| `startSession()` finds the connection dropped              | The server deleted the session on disconnect                                                          |

After a reset, `requestMove()` rejects until `startSession()` succeeds again,
which always connects a fresh socket. Disconnecting the old socket also makes
the server delete any session it still holds.

## How the mobile client uses this contract

| Client method    | Emits                                      | Resolves on                       | Rejects on                                                                                                                   |
| ---------------- | ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `startSession()` | `start-session` (after a lazy connect)     | `session-started` (validated)     | `connect_error`, `session-error`, `disconnect`, timeout                                                                      |
| `requestMove()`  | `evaluate-fen` with `{ fen, move, level }` | `evaluation-complete` (validated) | invalid level, no session, request already pending, invalid move, `evaluation-error`, `session-error`, `disconnect`, timeout |
| `disconnect()`   | none (closes the socket)                   | n/a                               | Rejects anything still pending and removes all listeners                                                                     |

- Each reply has a 10 second timeout (`timeoutMs`).
- `requestMove()` resolves with `{ move }` only. The client validates
  `mode: 'move'` and `move` with zod, and ignores `newFEN` and `moveDetails`
  (see Caveats). Callers apply the move to their own board.
- `move` must be a UCI move (`e7e5`) or a promotion from the seventh rank
  (`e7e8q`, `e2e1n`; pieces `q`, `r`, `b`, `n`, lowercase), or `'(none)'`.
  Anything else rejects with `Invalid evaluation-complete payload`.
  `'(none)'` resolves as `{ move: null }`: the engine has no legal move.
- Screens never touch the socket. They use the `StockfishClient` interface.

## Unresolved

- **Authentication: none.** The server has no handshake auth or tokens. Anyone
  who can reach the URL can open sessions. The mobile client sends no
  credentials (the issue says not to invent any).
- **Rate limits: none on the socket.** `express-rate-limit` is listed in the
  server's `package.json` but is not applied. Each session spawns a Stockfish
  process, so connection or session limits are an open server-side question.
- **Staging and production URLs** for the Stockfish server are not yet
  provided.
