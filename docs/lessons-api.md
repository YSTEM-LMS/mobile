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

| Field                 | Mobile type                    | Evidence or limitation                                                          |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `startFen`            | `string`                       | Present in the backend seed and website lesson data.                            |
| `name`                | `string`                       | Present in the backend route fixture and website lesson data.                   |
| `info`                | `string`                       | Present in the backend seed and website lesson data.                            |
| `solution`            | `string \| null`               | Website scenarios include string and `null` values.                             |
| `goal`                | `Goal \| number \| null`       | Website types define structured goals; the backend seed contains numeric goals. |
| `opponentConstraints` | `OpponentConstraint[] \| null` | Typed from the website union; production optionality is unconfirmed.            |
| `maxMoves`            | `number \| null`               | Present in the backend seed; production optionality is unconfirmed.             |
| `moves`               | `Move[] \| null`               | Typed from the website move shape; persisted item shape is unconfirmed.         |

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

## Verification Status

The backend route was verified by running its local route test with an
in-memory MongoDB: 12 tests passed, including a successful
`GET /lessons/getLesson` request. That test verifies one-based lookup and an
object response, but its fixture contains only `{ "name": "Capture" }` and
does not establish the complete production response shape.

The mobile gateway tests cover URL encoding, structured and numeric goals,
response validation, request failures, and the fake gateway.

## Questions Requiring YSTEM Confirmation

These questions should be addressed so we can produce a concrete lesson schema.

- Does production `goal` use numeric values, structured goals, or both?
- Are `solution`, `goal`, `opponentConstraints`, `maxMoves`, and `moves`
  optional or nullable in production data?
- Does persisted `moves` use the website `Move` shape?
- What is the ordering of lesson names? This is to make sure the website and backend assumes the same ordering format when requesting lessons, since the backend returns the lesson at `lessons[lessonNum - 1]`.
