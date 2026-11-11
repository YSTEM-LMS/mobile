# Puzzles API Contract

This page documents the agreement between the backend and the puzzle feature - what the YSTEM backend sends for puzzles, what the app gives to screens, and how the two are connected.

Code lives in `src/features/puzzles/`. Screens use the `useRandomPuzzles` hook and never call `fetch` directly.

## Endpoint

Current implementation assumes `GET /puzzles/random?limit=20` returns a JSON array of puzzle objects until we can verify the response structure against the running backend. The limit defaults to 20.

| Backend field     | Type   | Required | App field (`Puzzle`)                   |
| ----------------- | ------ | -------- | -------------------------------------- |
| `puzzleId`        | string | yes      | `id`                                   |
| `FEN` (uppercase) | string | yes      | `fen`                                  |
| `moves`           | string | yes      | `moves: string[]`                      |
| `rating`          | number | yes      | `rating`                               |
| `ratingDeviation` | number | no       | `ratingDeviation`                      |
| `popularity`      | number | no       | `popularity`                           |
| `nbPlays`         | number | no       | `plays`                                |
| `themes`          | string | no       | `themes: string[]` (`[]` if none)      |
| `gameUrl`         | string | no       | `gameUrl`                              |
| `openingTags`     | string | no       | `openingTags: string[]` (`[]` if none) |

Field names are case-sensitive: `FEN` is uppercase, `moves` and `themes` are lowercase.

`moves`,`themes`, and `openingTags` are space-separated strings. For example, `'c2d1 e6e1 d1e1'` becomes `['c2d1', 'e6e1', 'd1e1']`.

## Data flow

`client.get()` → `backendPuzzlesResponseSchema` (Zod) → `mapPuzzles()` → `Puzzle[]`

Nothing reaches feature code until it has passed the Zod schema. If the request fails or the data does not match, the data layer throws a `PuzzleDataError` instead of crashing the screen:

| `kind`             | Meaning                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `request-failed`   | No usable response (offline, timeout, server error).                |
| `invalid-response` | The backend answered, but the data did not match the puzzle schema. |

The error `message` is safe to show to students. The underlying error is kept in `originalError` for debugging only.

## Using it

```ts
const { puzzles, isLoading, isError, error, isRefetching, refetch } =
  useRandomPuzzles(20);
```

- `puzzles` is `undefined` until the first load succeeds.
- `isLoading` means there are no puzzles yet and a request is pending. It is also true while retrying after an error.
- `refetch` is the Retry button, and also fetches a fresh random batch.
- The query key is `['puzzles', 'random', limit]`.

## Fake API Client for Development purposes

The puzzle feature talks to the backend through a `PuzzleApiClient` type (`get(path, { signal })`). `defaultClient.ts` chooses which client to use.

For now, a fake client (`fakeClient.ts`) returns the sample puzzles in `fixtures.ts` because the shared API client is not merged yet. After the shared client merges, `defaultClient.ts` gets updated.

The fixtures use placeholder values in the backend's format. `FEN` and `moves` are not real chess positions, so they cannot be loaded onto a chessboard.

## Tests:

```bash
npm test -- --runInBand puzzle
```

This runs the four puzzle test files: `puzzleSchema`, `puzzleMapper`, `puzzleApi` and `useRandomPuzzles`.

## Still need to confirm with the backend:

- The response is a bare array, not wrapped in an object such as `{ puzzles: [...] }`
- Optional fields are ommitted when empty, not sent as `null`. `backendPuzzlesResponseSchema` rejects `null`.
- Whether the backend follows the Lichess Puzzle Database convention, particularly because it is assumed that `moves[0]` represents the opponent's setup move and `moves[1] begins the student's solution. The backend's field names and use of FEN/UCI notation suggest it follows the Lichness format, but this assumption has not yet been verified.
