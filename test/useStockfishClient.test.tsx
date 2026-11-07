import { renderHook } from '@testing-library/react-native';

import { useStockfishClient } from '@/features/play/hooks/useStockfishClient';
import { createFakeStockfishClient } from '@/features/play/services/fakeStockfishClient';

describe('useStockfishClient', () => {
  it('keeps one client across renders', () => {
    const createClient = jest.fn(() => createFakeStockfishClient());
    const { result, rerender } = renderHook(() =>
      useStockfishClient(createClient),
    );
    const first = result.current;

    rerender({});

    expect(result.current).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('disconnects the client when the game screen unmounts', async () => {
    const client = createFakeStockfishClient();
    const { unmount } = renderHook(() => useStockfishClient(() => client));
    await client.startSession();

    expect(client.disconnectCalls).toBe(0);
    unmount();

    expect(client.disconnectCalls).toBe(1);
    expect(client.hasSession).toBe(false);
  });
});
