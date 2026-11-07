# Puzzles API Contract

This document describes the verified YSTEM puzzle endpoint, the mobile-facing puzzle type, and how the data layer integrates with the shared API client.

Code lives in `src/features/puzzles/`. Screens use the `useRandomPuzzles` hook and never call `fetch` directly.

## Endpoint and verified response

`GET /puzzles/random?limit=20` returns a **bare JSON array** of puzzle objects. The backend defaults `limit` to 20 when a usable limit is not provided. This was confirmed by inspecting the backend code located at `middlewareNode/src/routes/puzzles.js` in the existing YSTEM REACT repository (YSTEM-LMS/react). The request (`GET /puzzles/random?limit=2`) returned HTTP 200 with two puzzle objects.

The random endpoint uses MongoDB's `$sample` to select random puzzles and returns them with their original fields, including MongoDB's `_id`. Local sample puzzles also include capitalized fields (`Moves`, `Themes`, `Rating`). However, our mobile data layer uses the lowercase fields defined in the backend model. Zod automatically removes any extra fields that aren't defined in our schema.

| Backend field     | Type                      | Required | App field (`Puzzle`)                   |
| ----------------- | ------------------------- | -------- | -------------------------------------- |
| `puzzleId`        | string                    | yes      | `id: string`                           |
| `FEN`             | string                    | yes      | `fen: string`                          |
| `moves`           | string                    | yes      | `moves: string[]`                      |
| `rating`          | number / `null` / omitted | no       | `rating?: number`                      |
| `ratingDeviation` | number / `null` / omitted | no       | `ratingDeviation?: number`             |
| `popularity`      | number / `null` / omitted | no       | `popularity?: number`                  |
| `nbPlays`         | number / `null` / omitted | no       | `plays?: number`                       |
| `themes`          | string / `null` / omitted | no       | `themes: string[]` (`[]` if missing)   |
| `gameUrl`         | string / `null` / omitted | no       | `gameUrl?: string`                     |
| `openingTags`     | string / `null` / omitted | no       | `openingTags: string[]` (`[]` if none) |

The backend's puzzle model (`middlewareNode/src/models/puzzles.js`) defines which fields are required and which are optional. The backend permits optional fields to be omitted or explicitly set to `null`. The mobile schema accepts either case and the mapper converts `null` to `undefined` for optional scalar fields or `[]` for tag arrays.

Field names are case-sensitive: The backend model uses uppercase `FEN` and lowercase `moves`, `rating`, and `themes`.

`moves`,`themes`, and `openingTags` are space-separated strings. For example, `'c2d1 e6e1 d1e1'` maps to `['c2d1', 'e6e1', 'd1e1']`.

### Move sequence interpretation

The existing YSTEM web application (`react-ystemandchess/src/features/puzzles/Puzzles.tsx`) uses the `moves` field to determine the order of moves in a puzzle.

When a puzzle starts, the application:

- Sets up the chessboard using the puzzle's `FEN`.
- Assigns the student the opposite color of the player whose turn it is in the `FEN`.
- Automatically plays the opponent's first move.
- Waits for the student to make the next move.
- Alternates between student and opponent moves until the puzzle is completed.

The move sequence follows this order:

- `moves[0]` — Opponent's initial move (played automatically).
- `moves[1]` — Student's first move.
- `moves[2]` — Opponent's next move.
- `moves[3]` — Student's next move, and so on.

This behavior was confirmed from YSTEM's existing web application.

## Shared API integration

Our puzzle data layer uses the shared API client (`src/services/api/apiClient.ts`) to request real puzzles from the YSTEM backend. The shared client gets the backend URL from `EXPO_PUBLIC_API_BASE_URL` through `src/config/env.ts`. It handles HTTP requests, JSON responses, timeouts, and request cancellation.
`useRandomPuzzles(limit)` passes TanStack Query's `AbortSignal` to `fetchRandomPuzzles()`, which forwards it to `client.get('/puzzles/random?limit=<limit>', { signal })`. **The screen must not call the backend directly.**

The feature keeps `createFakePuzzleClient()` in `fakeClient.ts` for tests. A test can inject it with `useRandomPuzzles(20, fakeClient)` or pass it directly to `fetchRandomPuzzles(fakeClient)`.

## Data flow and errors

`apiClient.get()` → `backendPuzzlesResponseSchema` (Zod) → `mapPuzzles()` → `Puzzle[]`

Only validated, mapped puzzles are returned to the hook. Errors remain `PuzzleDataError` objects with user-friendly messages and the original cause stored in `originalError`:

| `kind`             | Meaning                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `request-failed`   | HTTP/network failures, timeouts, cancellations, or other failures while requesting puzzles. |
| `invalid-response` | Malformed JSON reported by the shared client or JSON failing the puzzle Zod schema.         |

A successful but empty response body becomes `null` in the shared client and then fails the array schema as `invalid-response`. A valid empty array (`[]`) is accepted and maps to an empty list.

## Using it

```ts
const { puzzles, isLoading, isError, error, isRefetching, refetch } =
  useRandomPuzzles(20);
```

- `puzzles` is `undefined` until the first load succeeds.
- `isLoading` means a request is pending without successful data yet.
- `refetch` retries a request or fetches another batch.
- The query key is `['puzzles', 'random', limit]`.

## Tests:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run format:check
```

The fixtures in `src/features/puzzles/fixtures.ts` use valid, synthetic
chess positions and legal UCI move sequences. They provide full,
partial, minimal, and null-optional backend examples for testing
validation, mapping, and API behavior.

## Unanswered questions

- **Deployed puzzle data:** We haven't verified whether production puzzles contain explicit `null` values.
