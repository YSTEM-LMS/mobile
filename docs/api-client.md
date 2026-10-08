# API Client

Documentation of the shared API client's types, interfaces, and errors.

Relevant files:  
`src/services/api/apiClient.ts`  
`src/types/apiClient.types.ts`  
`src/services/api/apiError.ts`

## Public Types & Interfaces

| Type                 | Purpose                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TokenProvider`      | An asynchronous function that returns the current login token, or `null` when no token is available. The client calls it for each request and does not store the token. |
| `ApiClientOptions`   | Configuration used when creating an API client.                                                                                                                         |
| `RequestOptions`     | Optional settings applied to one request.                                                                                                                               |
| `ApiClientInterface` | The shared GET, POST, PUT, and DELETE methods used by production code.                                                                                                  |

### `ApiClientOptions`

| Field           | Description                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `baseUrl`       | Backend base URL for endpoints. The app client receives this from the `.env` configuration.                |
| `tokenProvider` | Optional `TokenProvider` field. When it returns a token, the client sends `Authorization: Bearer <token>`. |
| `timeoutMs`     | Maximum request duration in milliseconds before the client aborts with `REQUEST_TIMEOUT`.                  |

### `RequestOptions`

| Field     | Description                                                                                 |
| --------- | ------------------------------------------------------------------------------------------- |
| `signal`  | Optional caller-owned `AbortSignal`. Aborting it cancels the request with `REQUEST_CANCEL`. |
| `headers` | Additional request headers merged with the client's JSON headers.                           |

### `ApiClientInterface`

| Method       | Description                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `get<T>`     | Sends a GET request and resolves with parsed JSON of type `T`, or `null` for an empty successful response. |
| `post<T, B>` | Serializes a body of type `B` as JSON and resolves with parsed JSON of type `T`, or `null`.                |
| `put<T, B>`  | Serializes a body of type `B` as JSON and resolves with parsed JSON of type `T`, or `null`.                |
| `delete<T>`  | Sends a DELETE request and resolves with parsed JSON of type `T`, or `null`.                               |

Endpoints must begin with `/`. Failed requests reject with the normalized
`AppError` described below. The client does not automatically retry requests.

## API Client Errors

The shared API client rejects failed requests with an `AppError`.

| Code                | Trigger                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETWORK_ERROR`     | The request fails before an HTTP response is received, and it was not aborted by cancellation or a timeout. This commonly represents an unavailable network or unreachable backend. |
| `REQUEST_TIMEOUT`   | The client aborts the request after its configured timeout elapses.                                                                                                                 |
| `REQUEST_CANCEL`    | The caller aborts the `AbortSignal` supplied with the request.                                                                                                                      |
| `INVALID_RESPONSE`  | A successful response has a non-empty body that is not valid JSON.                                                                                                                  |
| `SESSION_EXPIRED`   | The backend responds with HTTP `401`.                                                                                                                                               |
| `PERMISSION_DENIED` | The backend responds with HTTP `403`.                                                                                                                                               |
| `SERVER_ERROR`      | The backend responds with any other unsuccessful HTTP status.                                                                                                                       |
| `UNKNOWN`           | The asynchronous token provider fails before the request can be sent.                                                                                                               |

`AppError.status` contains the HTTP status when the backend returned a response, EXCEPT for network, timeout, cancel, and token-provider errors.
