import { useEffect, useState } from 'react';

import {
  createStockfishClient,
  type StockfishClient,
} from '../services/StockfishClient';

/**
 * Gives a game screen one StockfishClient for as long as it is mounted, and
 * disconnects it when the screen unmounts (leaving the game). The server
 * deletes the session when the socket closes.
 *
 * The screen still calls startSession() itself. The client reconnects lazily,
 * so it stays usable after React's development-only unmount/remount.
 *
 * @param createClient - Tests pass createFakeStockfishClient here.
 */
export function useStockfishClient(
  createClient: () => StockfishClient = createStockfishClient,
): StockfishClient {
  const [client] = useState(() => createClient());

  useEffect(() => () => client.disconnect(), [client]);

  return client;
}
