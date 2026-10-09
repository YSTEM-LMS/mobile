# Stockfish Socket Contract

Source: YSTEM-LMS/react, stockfishServer/src/managers/socket.js (commit <hash>)

## Connection

- URL: EXPO_PUBLIC_STOCKFISH_SOCKET_URL
- Server: socket.io ^4.8.1 · Mobile client: socket.io-client 4.x
- Transports: TODO (does the server allow only websocket?)

## Client → server events

### start-session

```ts
{ sessionType: 'player-vs-computer', fen: 'start' }
```

Server reply: TODO (does it emit anything back? an error event?)

### evaluate-fen

```ts
{ fen: string, move: string, level: 1 | 2 | 3 | 4 | 5 }
```

- move format: TODO (UCI "e2e4" or SAN "e4"?)
- how level is used: TODO (see StockfishManager.js)

## Server → client events

### evaluation-complete

```ts
TODO: exact payload copied from the server code
```

Example payload: TODO (from stockfishServer/src/tests)

### Errors

TODO: event name and payload when evaluation fails

## Unresolved

- Authentication: TODO (none found / unknown)
- Rate limits: TODO (none found / unknown)
- Session lifetime / multiple sessions per socket: TODO
