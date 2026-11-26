# Lesson Data Gateway

Documentation of the lesson data gateway, verified backend contract, and
known schema limitations.

Relevant files:  
`src/features/lessons/api/ApiLessonGateway.ts`  
`src/features/lessons/api/lesson.gateway.ts`  
`src/features/lessons/api/lesson.mapper.ts`  
`src/features/lessons/api/lesson.schema.ts`  
`src/features/lessons/api/lesson.types.ts`

## Endpoint

| Method | Endpoint             | Description                                                    |
| ------ | -------------------- | -------------------------------------------------------------- |
| `GET`  | `/lessons/getLesson` | Returns one lesson from the backend's `newLessons` collection. |

### Query Parameters

| Parameter   | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| `piece`     | Exact lesson/scenario name used by the backend lookup.                         |
| `lessonNum` | Positive, one-based lesson number. The route returns `lessons[lessonNum - 1]`. |

The mobile gateway URL-encodes both parameters and uses the central API address
from `env.apiBaseUrl` through `apiClient`.

## Authentication Behavior

The backend route uses optional JWT authentication through Passport. A valid
token populates `req.user`, but unauthenticated requests are not rejected by
this route.

The mobile gateway does not add authentication itself. The shared API client
sends `Authorization: Bearer <token>` when its token provider is configured.

## Supported Response Fields

The following fields are supported by the mobile schema based on the backend
seed and website lesson types:

| Field                 | Mobile type                    | Evidence or limitation                                                                                                                     |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `startFen`            | `string`                       | Present in the backend seed and website lesson data.                                                                                       |
| `name`                | `string`                       | Present in the backend route fixture and website lesson data.                                                                              |
| `info`                | `string`                       | Present in the backend seed and website lesson data.                                                                                       |
| `solution`            | `string \| null`               | Website scenarios include string and `null` values.                                                                                        |
| `goal`                | `Goal \| null`                 | Structured goals per the website types. The local demo seed may send a numeric placeholder (e.g. `1`), which the mapper turns into `null`. |
| `opponentConstraints` | `OpponentConstraint[] \| null` | Typed from the website union.                                                                                                              |
| `maxMoves`            | `number \| null`               | Present in the backend seed.                                                                                                               |

The response does not provide the request's `piece` or `lessonNum` since those are only used to locate the lesson. These
values are not included in the mapped `Lesson` type.

## Missing Data and Errors

The gateway validates requests and responses with Zod. Invalid request or
response data produces a controlled `AppError` with code `INVALID_RESPONSE`.
Transport and HTTP failures use the shared API client's normalized errors.

The backend route returns:

| Situation                               | Status |
| --------------------------------------- | ------ |
| Missing or invalid parameters           | `400`  |
| Unknown piece                           | `400`  |
| Lesson number outside the piece's range | `404`  |

Successful empty responses become `null` in `apiClient` and fail lesson
response validation as missing data.

## Website Piece Names and Lesson Numbers

The website obtains lesson/scenario names from
`react-ystemandchess/src/features/lessons/lessons-main/Scenarios.js`. Its
selection UI finds a zero-based array index, and the request layer converts it
to `lessonNum = index + 1`. The backend performs an exact name lookup, so the
mobile app must preserve the selected string.

## Backend Verification Status

The backend route was verified by running its local route test with an
in-memory MongoDB.

The mobile gateway tests cover URL encoding, structured and numeric goals, response validation, request failures, and the fake gateway.

NOTE: The local demo seed may return numeric `"goal": 1`; the mobile mapper treats it as a placeholder and maps it to `null`.

### Lesson 1

`GET /lessons/getLesson?piece=Knight%20-%20It%20moves%20in%20an%20L%20shape&lessonNum=1`

```json
{
  "startFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "name": "Introduction",
  "info": "Welcome to the Knight - It moves in an L shape lesson! Let's get started.",
  "solution": "e2e4",
  "goal": 1,
  "opponentConstraints": [],
  "maxMoves": 10
}
```

### Lesson 2

`GET /lessons/getLesson?piece=Knight%20-%20It%20moves%20in%20an%20L%20shape&lessonNum=2`

```json
{
  "startFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "name": "Challenge",
  "info": "Solve the Knight - It moves in an L shape tactical challenge.",
  "solution": "d2d4",
  "goal": 1,
  "opponentConstraints": [],
  "maxMoves": 10
}
```
