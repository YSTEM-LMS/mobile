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

## Board component

`LessonExerciseBoard` (`src/features/lessons/exercise/LessonExerciseBoard.tsx`)
mounts the controller on the shared `ChessBoard_component`. It takes the same
inputs as the hook (`lesson`, `startFen`, `solution`, optional `onComplete`) and
renders the board, move feedback, the save status, and a "Try again" button.

The computer game uses the same board with `useComputerGame`. The board only
needs `fen`, `orientation`, `disabled`, `onMove` and `lastMove`, so each screen
supplies its own controller and the board is not changed. A lesson with no
`solution` stays a read-only board. A solution that is present but unsupported
shows an error and disables the board.

## Saving progress

Lesson Detail passes the progress adapter's `useSaveLessonCompletion().mutateAsync`
as `onComplete`. It takes `{ piece, lessonNumber }` (one-based). The adapter
converts the number for the backend, saves, reads the count back, and rejects
if the server did not confirm it. The controller shows "Progress saved." only
when the call resolves, and shows the error message when it rejects, so an
unsaved lesson is never shown as saved. Finishing a new attempt after "Try
again" calls it again, and the backend is responsible for not advancing the
count twice. An expired session is handled by the adapter, which signs the
student out.

## Dependencies

- #15 (chessboard) and #41 (lesson data layer), both merged.
- The numeric `goal` placeholder fix in the lesson schema and mapper.
  Learn and Lesson Detail: branch `feat(lessons)/load-lessons`.
- Lesson completion progress adapter: branch `feat/lesson-completion-progress`,
  PR #<52>.
- The controller's own tests do not need either of them.

## Verification

Covered by unit tests with fixtures and one real demo record. **Not yet
verified** against a lesson loaded through the real gateway on the combined
branch.
