# Authentication

Documentation of the authentication gateway, session state, and secure token handling.

Relevant files:  
`src/services/auth/AuthGateway.ts`  
`src/providers/SessionProvider.tsx`  
`src/services/storage/TokenStore.ts`  
`src/types/authGateway.ts`  
`src/state/session.ts`

## Public Types & Interfaces

| Type            | Purpose                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `AuthGateway`   | Login, session validation, and local logout.                                                             |
| `LoginResponse` | Backend login response containing `{ token: string }`.                                                   |
| `SessionState`  | Current session status: `bootstrapping`, `anonymous`, `authenticated`, `expired`, or `error`.            |
| `SessionUser`   | Authenticated user's `username`, `displayName`, and `role`. Available when the session is authenticated. |
| `UserRole`      | Supported roles: `student` and `mentor`.                                                                 |

### `AuthGateway`

| Method                      | Description                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `login(username, password)` | Sends `POST /auth/login` with `{ username, password }` through the shared client and returns the response token, or an empty string if no token is returned. `SessionProvider` rejects an empty token and stores a successful login token. |
| `validate(token)`           | Sends `POST /auth/validate` with the supplied bearer token and `responseType: 'text'`. Accepts the backend's plain-text `OK` or an empty successful response. Returns `true` on success or `false` for HTTP `401`. Other failures reject.  |
| `logout()`                  | Deletes the stored token through `tokenStore`. No server-side logout endpoint is called.                                                                                                                                                   |

`authGateway` is the shared instance. `createAuthGateway(client)` accepts an API
client implementation so gateway behavior can be tested with a fake client.
The gateway does not expose a method for retrieving the stored token.

Validation selects text mode because the backend returns HTTP `200` with the
plain-text body `OK`. Login uses the default JSON mode for `{ token }`. Gateway and storage errors use the shared
`AppError` from `@/services/api/apiError`.

### `useSession()`

Screens use `useSession()` inside `SessionProvider` to access user information
and perform session operations.

| Member                       | Description                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session`                    | Current session state. Check `session.status` before accessing user information.                                                                                            |
| `signIn(username, password)` | Calls the authentication gateway, checks the returned user claims, securely stores the token, and updates the authenticated session.                                        |
| `signOut()`                  | Cancels queries, clears the query cache, deletes the stored token through the gateway, and changes the session to anonymous. Failures reject so the caller can offer retry. |
| `restoreSession()`           | Reads the stored token and validates normal sessions with the backend before reading user claims. Temporary validation failures preserve the token and allow retry.         |
| `expiredSession()`           | Clears queries and the stored token, then marks the session expired. Cleanup failures put the session in an error state.                                                    |
| `mockSignInAs(role)`         | Development-only student or mentor quick login using fixture tokens.                                                                                                        |

Development quick-login fixture tokens use a fake gateway for restoration,
gated by `__DEV__`. Normal restored sessions require backend validation;
decoding JWT claims alone does not authenticate the user.

## Accessing the Authenticated User

Read user information from session context instead of reading SecureStore or
decoding tokens in a screen:

```tsx
import { AppText } from '@/components/ui/AppText';
import { useSession } from '@/providers/SessionProvider';

function ProfileGreeting() {
  const { session } = useSession();

  if (session.status !== 'authenticated') {
    return null;
  }

  return <AppText>Hello, {session.user.username}</AppText>;
}
```

`session.user.displayName` and `session.user.role` are also available in the
authenticated state.

## Authenticated API Requests

Feature gateways use the shared `apiClient` described in [API Client](api-client.md).
The client uses the centrally configured `env.apiBaseUrl`.
Its configured `tokenProvider` calls `tokenStore.getToken()` for each request
and adds `Authorization: Bearer <token>` when a token exists. The client reads
the current stored token for each request rather than caching a token value.

Screens do not need to retrieve a token from `AuthGateway` or SecureStore,
construct bearer headers, or call `fetch` directly. They use session operations
for authentication and their feature hooks, such as `useProfile()` or gateways for API requests.

An explicitly supplied `Authorization` header takes priority over the stored
token. This allows `authGateway.validate(token)` to validate its exact argument
even if storage contains another token.
