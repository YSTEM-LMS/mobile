# Environment configuration

The mobile app supports three explicit environments:

| Environment   | Purpose                                             | API requirement | Socket requirement |
| ------------- | --------------------------------------------------- | --------------- | ------------------ |
| `development` | Local development and developer-owned test services | HTTP or HTTPS   | HTTP or HTTPS      |
| `preview`     | Shared internal testing and release candidates      | HTTPS           | HTTPS              |
| `production`  | Publicly released application                       | HTTPS           | HTTPS              |

Environment selection must use `EXPO_PUBLIC_APP_ENV`. Do not use `NODE_ENV` to
select a backend because Expo and other tools manage `NODE_ENV` for their own
build behavior.

Use HTTP/HTTPS server addresses for both Socket.IO services, matching the
Stockfish client's configuration. Socket.IO also supports WS/WSS addresses,
but this project standardizes on HTTP/HTTPS. The client's transport options
control whether it uses WebSocket; an HTTP/HTTPS server address does not
disable WebSocket. See the [Socket.IO documentation](https://socket.io/docs/v4/client-initialization/).

## Local setup

Copy the tracked example file:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

Expo automatically loads `.env.local`. The file is ignored by Git and may be
changed for an individual developer's machine.

The required public values are:

```text
EXPO_PUBLIC_APP_ENV=development|preview|production
EXPO_PUBLIC_API_BASE_URL=https://...
EXPO_PUBLIC_CHESS_SOCKET_URL=https://...
EXPO_PUBLIC_STOCKFISH_SOCKET_URL=https://...
```

| Variable                           | Used for                                                            | Shared configuration property |
| ---------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| `EXPO_PUBLIC_APP_ENV`              | Selects development, preview, or production validation rules        | `env.appEnv`                  |
| `EXPO_PUBLIC_API_BASE_URL`         | Main backend API for authentication, profiles, lessons, and puzzles | `env.apiBaseUrl`              |
| `EXPO_PUBLIC_CHESS_SOCKET_URL`     | Live chess Socket.IO service                                        | `env.chessSocketUrl`          |
| `EXPO_PUBLIC_STOCKFISH_SOCKET_URL` | Computer opponent's Stockfish Socket.IO service                     | `env.stockfishSocketUrl`      |

All four settings are required at startup. Local example addresses can remain
configured while a service is not running: validation checks the address, not
whether the server is online. This issue does not open any connections.

Import `env` from `@/config/env` in service code instead of reading `process.env`
in components. The explicit `process.env.EXPO_PUBLIC_*` reads stay centralized
in `src/config/env.ts` so Expo can include them in the bundle.

The example API URL, `http://10.0.2.2:8000`, reaches port 8000 on the host
computer from the standard Android emulator. The chess and Stockfish examples
use `http://10.0.2.2:3001` and `http://10.0.2.2:8080`. These are local examples,
not confirmed staging addresses; match the ports to your local servers. Use:

- `http://localhost:8000` from an iOS simulator on the same Mac;
- `http://localhost:<port>` for sockets from an iOS simulator on the same Mac;
- the computer's LAN address for all three services from a physical device;
- approved HTTPS endpoints for all services in preview or production.

Restart Expo after changing an environment file. Clear Metro's cache if a
previous value remains:

```bash
npx expo start --clear
```

## Validation

`src/config/env.ts` validates configuration when the application starts. It:

- accepts only `development`, `preview`, or `production`;
- requires all three valid service URLs;
- accepts HTTP or HTTPS for all services in development;
- requires HTTPS for all services in preview and production;
- rejects URLs containing credentials, query strings, or fragments;
- removes trailing slashes so API clients can join paths consistently.

Missing or invalid configuration raises `EnvironmentConfigError` with the
invalid field name and a safe explanation.
For example, `stockfishSocketUrl must use HTTPS outside development` identifies
the setting without echoing the URL or any credentials it might contain.

## Security

Every variable prefixed with `EXPO_PUBLIC_` is included in the application
bundle and is readable by users. Public endpoint locations may use this
prefix. Passwords, JWT signing secrets, database credentials, provider secret
keys, private certificates, and app-store credentials must never use it or be
committed to this repository.

## EAS environments

EAS profiles and hosted environment values are intentionally deferred until Y
STEM approves the Expo organization, project owner, application identifiers,
build budget, signing responsibilities, and release policy. Once approved,
development, preview, and production profiles must provide the same validated
variables described above.
