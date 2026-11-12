import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import {
  createStockfishClient,
  type EngineMove,
  type StockfishClient,
} from '@/features/play/services/StockfishClient';

import PlayGameRoute from '../app/(app)/play-game';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ color: 'white', difficulty: 'easy' }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

jest.mock('@/features/play/services/StockfishClient', () => ({
  createStockfishClient: jest.fn(),
}));

const client: jest.Mocked<StockfishClient> = {
  startSession: jest.fn(),
  requestMove: jest.fn(),
  disconnect: jest.fn(),
};

beforeEach(() => {
  client.startSession.mockReset();
  client.startSession.mockResolvedValue(undefined);
  client.requestMove.mockReset();
  client.disconnect.mockReset();
  jest.mocked(createStockfishClient).mockReset();
  jest.mocked(createStockfishClient).mockReturnValue(client);
});

async function waitUntilReady() {
  await waitFor(() => expect(screen.queryByText('Starting game…')).toBeNull());
}

describe('PlayGameRoute', () => {
  it('locks the board while the session starts, then unlocks it', async () => {
    let ready!: () => void;
    client.startSession.mockReturnValue(
      new Promise<void>((resolve) => {
        ready = resolve;
      }),
    );
    render(<PlayGameRoute />);

    expect(screen.getByText('Starting game…')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Chess square e2'));
    expect(screen.queryByTestId('legal-move-e3')).toBeNull();

    await act(async () => {
      ready();
    });
    await waitUntilReady();

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    expect(screen.getByTestId('legal-move-e3')).toBeTruthy();
  });

  it('sends the move, shows the engine reply, and unlocks the board', async () => {
    let reply!: (move: EngineMove) => void;
    client.requestMove.mockReturnValue(
      new Promise<EngineMove>((resolve) => {
        reply = resolve;
      }),
    );
    render(<PlayGameRoute />);
    await waitUntilReady();

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    fireEvent.press(screen.getByLabelText('Chess square e4'));

    await waitFor(() =>
      expect(client.requestMove).toHaveBeenCalledWith({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        level: 2,
      }),
    );

    await act(async () => {
      reply({ move: 'e7e5' });
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Black p on e5')).toBeTruthy(),
    );
    expect(screen.getByLabelText('White p on e4')).toBeTruthy();
    // The board accepts input again after the reply.
    fireEvent.press(screen.getByLabelText('Chess square d2'));
    expect(screen.getByTestId('legal-move-d3')).toBeTruthy();
  });

  it('shows a session-start failure and recovers on Retry', async () => {
    client.startSession.mockRejectedValueOnce(
      new Error('Stockfish connect_error: Connection refused'),
    );
    render(<PlayGameRoute />);

    expect(await screen.findByText("Couldn't start the game")).toBeTruthy();
    expect(
      screen.getByText('Stockfish connect_error: Connection refused'),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Retry'));
    await waitFor(() =>
      expect(screen.queryByText("Couldn't start the game")).toBeNull(),
    );
  });

  it('shows an engine failure and keeps the player move on the board', async () => {
    client.requestMove.mockRejectedValue(
      new Error('Timed out after 10000 ms waiting for evaluation-complete'),
    );
    render(<PlayGameRoute />);
    await waitUntilReady();

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    fireEvent.press(screen.getByLabelText('Chess square e4'));

    expect(await screen.findByText("The computer couldn't move")).toBeTruthy();
    expect(screen.getByText(/Timed out/)).toBeTruthy();
    expect(screen.getByLabelText('White p on e4')).toBeTruthy();
  });

  it('disconnects the client when the screen is left', async () => {
    const { unmount } = render(<PlayGameRoute />);
    await waitUntilReady();

    unmount();

    expect(client.disconnect).toHaveBeenCalled();
  });
});
