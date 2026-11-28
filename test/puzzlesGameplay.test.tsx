import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Chess } from 'chess.js';

import PuzzlesRoute, { PuzzleGameplay } from '../app/(app)/puzzles';
import {
  fullPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle } from '../src/features/puzzles/mapper';
import { useRandomPuzzles } from '../src/features/puzzles/useRandomPuzzles';

// Exercise the real screen/session logic without depending on native gestures.
// Each labeled button simulates the onMove callback of the shared chessboard.
jest.mock('@/components/chess/Chessboard-component', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  function MockChessBoard({
    fen,
    disabled,
    orientation,
    onMove,
  }: {
    fen: string;
    disabled?: boolean;
    orientation?: string;
    onMove?: (from: string, to: string) => void;
  }) {
    const moveButton = (label: string, from: string, to: string) =>
      createElement(Pressable, {
        accessibilityLabel: label,
        onPress: () => onMove?.(from, to),
      });

    return createElement(
      View,
      null,
      createElement(Text, { testID: 'board-fen' }, fen),
      createElement(
        Text,
        { testID: 'board-disabled' },
        disabled ? 'disabled' : 'enabled',
      ),
      createElement(Text, { testID: 'board-orientation' }, orientation),
      moveButton('Attempt incorrect move', 'e7', 'e5'),
      moveButton('Attempt first puzzle answer', 'b8', 'c6'),
      moveButton('Attempt second puzzle answer', 'e7', 'e6'),
      moveButton('Attempt pawn promotion', 'a7', 'a8'),
    );
  }

  return { ChessBoard_component: MockChessBoard };
});

jest.mock('@/features/puzzles/useRandomPuzzles', () => ({
  useRandomPuzzles: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View };
});

const fullPuzzle = mapPuzzle(fullPuzzleFixture);
const partialPuzzle = mapPuzzle(partialPuzzleFixture);

function expectedFen(puzzle: typeof fullPuzzle, uciMoves: string[]) {
  const game = new Chess(puzzle.fen);
  for (const uci of uciMoves) {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      ...(uci.length > 4 ? { promotion: uci[4] } : {}),
    });
  }
  return game.fen();
}

function mockLoadedBatch(puzzles = [fullPuzzle, partialPuzzle]) {
  const refetch = jest.fn().mockResolvedValue({ isSuccess: true });
  (useRandomPuzzles as jest.Mock).mockReturnValue({
    puzzles,
    isLoading: false,
    isError: false,
    error: null,
    isRefetching: false,
    refetch,
  });
  return refetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Puzzles screen gameplay', () => {
  it('plays the setup exactly once and makes the student board interactive', () => {
    const screen = render(<PuzzleGameplay puzzle={fullPuzzle} />);

    expect(screen.getByTestId('board-fen').props.children).toBe(
      expectedFen(fullPuzzle, ['g1f3']),
    );
    expect(screen.getByTestId('board-orientation').props.children).toBe(
      'black',
    );
    expect(screen.getByTestId('board-disabled').props.children).toBe('enabled');
  });

  it('keeps the board after a wrong move, then plays a scripted reply', () => {
    const screen = render(<PuzzleGameplay puzzle={fullPuzzle} />);
    const setupFen = screen.getByTestId('board-fen').props.children;

    fireEvent.press(screen.getByLabelText('Attempt incorrect move'));
    expect(screen.getByTestId('board-fen').props.children).toBe(setupFen);
    expect(screen.getByText('Not quite. Try another move.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Attempt first puzzle answer'));
    expect(screen.getByTestId('board-fen').props.children).toBe(
      expectedFen(fullPuzzle, ['g1f3', 'b8c6', 'f1c4']),
    );
    expect(screen.getByText('Puzzle complete!')).toBeTruthy();
    expect(screen.getByTestId('board-disabled').props.children).toBe(
      'disabled',
    );
  });

  it('Retry resets the setup, feedback, and disabled state after completion', () => {
    const screen = render(<PuzzleGameplay puzzle={partialPuzzle} />);
    const setupFen = screen.getByTestId('board-fen').props.children;

    fireEvent.press(screen.getByLabelText('Attempt second puzzle answer'));
    expect(screen.getByText('Puzzle complete!')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Retry Puzzle'));
    expect(screen.getByTestId('board-fen').props.children).toBe(setupFen);
    expect(screen.queryByText('Puzzle complete!')).toBeNull();
    expect(screen.getByTestId('board-disabled').props.children).toBe('enabled');
  });

  it('Next Puzzle starts the other record without carrying over feedback', () => {
    mockLoadedBatch();
    const screen = render(<PuzzlesRoute />);

    fireEvent.press(screen.getByLabelText('Attempt first puzzle answer'));
    expect(screen.getByText('Puzzle complete!')).toBeTruthy();

    fireEvent.press(screen.getByText(/^Next Puzzle\s*›$/));
    expect(screen.queryByText('Puzzle complete!')).toBeNull();
    expect(screen.getByTestId('board-fen').props.children).toBe(
      expectedFen(partialPuzzle, ['c2c4']),
    );
    expect(screen.getByTestId('board-disabled').props.children).toBe('enabled');
  });

  it('skips an invalid record without trying to display its chessboard', () => {
    mockLoadedBatch([{ ...fullPuzzle, fen: 'invalid-fen' }, partialPuzzle]);
    const screen = render(<PuzzlesRoute />);

    expect(screen.getByText('Puzzle unavailable')).toBeTruthy();
    expect(screen.queryByTestId('board-fen')).toBeNull();

    fireEvent.press(screen.getByText(/^Next Puzzle\s*›$/));
    expect(screen.queryByText('Puzzle unavailable')).toBeNull();
    expect(screen.getByTestId('board-fen').props.children).toBe(
      expectedFen(partialPuzzle, ['c2c4']),
    );
  });

  it('resets even when a new batch repeats the same ID', async () => {
    const refetch = mockLoadedBatch([fullPuzzle]);
    const screen = render(<PuzzlesRoute />);

    fireEvent.press(screen.getByLabelText('Attempt first puzzle answer'));
    expect(screen.getByText('Puzzle complete!')).toBeTruthy();

    fireEvent.press(screen.getByText('Get New Batch'));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Puzzle complete!')).toBeNull();
    });
    expect(screen.getByTestId('board-fen').props.children).toBe(
      expectedFen(fullPuzzle, ['g1f3']),
    );
  });

  it('allows choosing a non-queen pawn promotion', () => {
    const promotionPuzzle = {
      ...fullPuzzle,
      id: 'promotion-test',
      fen: '8/P7/8/8/8/8/7k/4K3 b - - 0 1',
      moves: ['h2h3', 'a7a8n'],
    };
    const screen = render(<PuzzleGameplay puzzle={promotionPuzzle} />);

    expect(screen.getByText('Promote pawn to')).toBeTruthy();
    fireEvent.press(screen.getByText('Knight'));
    fireEvent.press(screen.getByLabelText('Attempt pawn promotion'));
    expect(screen.getByText('Puzzle complete!')).toBeTruthy();
  });
});
