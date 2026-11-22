# Lesson exercise controller

`useLessonExercise` runs a lesson with a scripted solution: the learner makes
a move, gets feedback, retries after a wrong attempt, and completes the
exercise. It is a hook with no UI. A screen renders the board from the values
it returns.

Files: `src/features/lessons/exercise/useLessonExercise.ts`,
`src/features/lessons/exercise/parseSolution.ts`,
`src/features/lessons/exercise/exercise.fixtures.ts`.

## Input

| Field        | Description                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `lesson`     | `{ piece, lessonNumber }` (`LessonRequest`). One-based. Passed back untouched to `onComplete`. |
| `startFen`   | The lesson's `startFen`.                                                                       |
| `solution`   | The lesson's `solution` string.                                                                |
| `onComplete` | Optional. Called once per successful attempt with `{ piece, lessonNumber }`. May be async.     |

The state resets when `lesson`, `startFen` or `solution` change, so one
controller serves any record.

## Supported solution format (this milestone)

Space-separated **coordinate moves**, for example `e2e4` or `a7a8q`.

- The learner plays the side to move in `startFen`. The board flips for Black.
- Steps alternate learner, scripted reply, learner, and so on. Both verified
  demo records contain a single learner move. **A scripted reply has no
  verified backend example yet**, so it is only tested with fixtures.
- A promotion piece (`q`, `r`, `b`, `n`) is part of the move. The learner does
  not choose it.
- The whole solution is replayed in chess.js from `startFen` once. SAN or PGN
  text, an empty or missing solution, an invalid FEN, or an illegal move gives
  `phase: 'error'` with a code and a readable message, and the board is
  disabled.

Not used: `goal`, `opponentConstraints`, `maxMoves`, `moves`.

## Returned values

| Value                       | Meaning                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `position`, `orientation`   | The FEN to render and the side at the bottom                       |
| `lastMove`                  | The last move applied, including a scripted reply                  |
| `phase`                     | `learner-turn`, `complete` or `error`                              |
| `feedback`, `wrongAttempts` | `none`, `correct` or `wrong`, and how many wrong attempts so far   |
| `inputDisabled`             | True unless it is the learner's turn                               |
| `error`                     | `{ code, message }` for an invalid or unsupported solution         |
| `saveStatus`, `saveError`   | `idle`, `saving`, `saved` or `failed`, and the error message       |
| `makeMove(from, to)`        | Pass this to the board's `onMove`. True only for the expected move |
| `reset()`                   | Starts a new attempt                                               |

A legal but wrong move leaves the position unchanged and sets `feedback` to
`wrong`. An illegal move is ignored.

## Completion callback

`onComplete({ piece, lessonNumber })` fires **once per attempt**, after the
last required move. `reset()` starts a new attempt, which may fire again. The
backend write belongs to the progress adapter. The hook tracks `saveStatus` so
a screen never shows an unsaved lesson as saved, and a late result from an old
attempt or after unmount is ignored.

## Dependencies

- #15 (chessboard) and #41 (lesson data layer), both merged.
- The numeric `goal` placeholder fix in the lesson schema and mapper.
- Wiring into Lesson Detail needs the Learn/Lesson Detail PR, and saving needs
  the progress adapter PR. Neither is required for this PR's tests.

## Verification

Covered by unit tests with fixtures and one real demo record. **Not yet
verified** against a lesson loaded through the real gateway on the combined
branch.
