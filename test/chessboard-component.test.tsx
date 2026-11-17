import { act, render, fireEvent } from '@testing-library/react-native';
import { ChessBoard_component } from '@/components/chess/Chessboard-component';
import { StyleSheet } from 'react-native';
import {
  Gesture,
  type GestureStateChangeEvent,
  type PanGesture,
  type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('ChessBoard_component', () => {
  afterEach(() => jest.restoreAllMocks());

  function gesturePoint(x: number, y: number) {
    return { x, y } as GestureStateChangeEvent<PanGestureHandlerEventPayload>;
  }

  async function drop(
    gesture: PanGesture,
    from: [number, number],
    to: [number, number],
    success: boolean,
  ) {
    expect(gesture.config.enabled).toBe(true);
    await act(async () => {
      const start = gesturePoint(...from);
      gesture.handlers.onBegin?.(start);
      gesture.handlers.onStart?.(start);
      gesture.handlers.onFinalize?.(gesturePoint(...to), success);
    });
  }
  test('Starting position renders correctly', () => {
    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} />,
    );

    expect(getByLabelText('Chess square e4')).toBeTruthy();
    expect(getByLabelText('White p on e2')).toBeTruthy();
  });

  test('Custom FEN renders correctly', () => {
    const fen = '8/8/8/8/8/8/4K3/7k w - - 0 1';

    const { getByLabelText, queryByLabelText } = render(
      <ChessBoard_component fen={fen} />,
    );

    expect(getByLabelText('White k on e2')).toBeTruthy();
    expect(queryByLabelText('White p on e2')).toBeNull();
  });

  test('White orientation renders correctly', () => {
    const { getAllByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} orientation="white" />,
    );

    const squares = getAllByLabelText(/^Chess square /);
    expect(squares).toHaveLength(64);
    expect(squares[0].props.accessibilityLabel).toBe('Chess square a8');
    expect(squares[63].props.accessibilityLabel).toBe('Chess square h1');
  });

  test('Black orientation renders correctly', () => {
    const { getAllByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} orientation="black" />,
    );

    const squares = getAllByLabelText(/^Chess square /);
    expect(squares).toHaveLength(64);
    expect(squares[0].props.accessibilityLabel).toBe('Chess square h1');
    expect(squares[63].props.accessibilityLabel).toBe('Chess square a8');
  });

  test('Selecting a piece highlights legal destinations', () => {
    const { getByLabelText, getByTestId, queryByTestId, queryAllByTestId } =
      render(<ChessBoard_component fen={STARTING_FEN} />);

    // No indicators before anything is selected.
    expect(queryAllByTestId(/^legal-move-/)).toHaveLength(0);

    // Select the white pawn on e2.
    fireEvent.press(getByLabelText('Chess square e2'));

    expect(getByTestId('legal-move-e3')).toBeTruthy();
    expect(getByTestId('legal-move-e4')).toBeTruthy();
    expect(queryByTestId('legal-move-e5')).toBeNull();
  });

  test('Illegal moves are rejected', () => {
    const onMove = jest.fn();

    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} onMove={onMove} />,
    );

    fireEvent.press(getByLabelText('Chess square e2'));
    fireEvent.press(getByLabelText('Chess square e5'));

    expect(onMove).not.toHaveBeenCalled();
  });

  test('Legal moves trigger the callback', () => {
    const onMove = jest.fn();

    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} onMove={onMove} />,
    );

    fireEvent.press(getByLabelText('Chess square e2'));
    fireEvent.press(getByLabelText('Chess square e4'));

    expect(onMove).toHaveBeenCalledWith('e2', 'e4');
  });

  test.each([
    ['white', 180, 260, 180, 180],
    ['black', 140, 60, 140, 140],
  ] as const)(
    'A legal drop on the %s board emits one move',
    async (orientation, x, y, toX, toY) => {
      const pan = jest.spyOn(Gesture, 'Pan');
      const onMove = jest.fn();
      const { getByTestId, getByLabelText } = render(
        <ChessBoard_component
          fen={STARTING_FEN}
          orientation={orientation}
          onMove={onMove}
        />,
      );
      fireEvent(getByTestId('chessboard-grid'), 'layout', {
        nativeEvent: { layout: { width: 320 } },
      });
      await drop(
        pan.mock.results.at(-1)?.value as PanGesture,
        [x, y],
        [toX, toY],
        true,
      );
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onMove).toHaveBeenCalledWith('e2', 'e4');
      expect(getByLabelText('White p on e2')).toBeTruthy();
    },
  );

  test.each([
    ['illegal', true, 180, 140],
    ['off-board', true, 320, 180],
    ['canceled', false, 180, 180],
  ] as const)(
    'An %s drop leaves the parent position intact',
    async (_reason, success, x, y) => {
      const pan = jest.spyOn(Gesture, 'Pan');
      const onMove = jest.fn();
      const { getByTestId, getByLabelText } = render(
        <ChessBoard_component fen={STARTING_FEN} onMove={onMove} />,
      );
      fireEvent(getByTestId('chessboard-grid'), 'layout', {
        nativeEvent: { layout: { width: 320 } },
      });
      await drop(
        pan.mock.results.at(-1)?.value as PanGesture,
        [180, 260],
        [x, y],
        success,
      );
      expect(onMove).not.toHaveBeenCalled();
      expect(
        StyleSheet.flatten(getByLabelText('White p on e2').props.style).opacity,
      ).toBeUndefined();
    },
  );

  test('Disabled mode prevents moves', () => {
    const onMove = jest.fn();

    const { getByLabelText } = render(
      <ChessBoard_component
        fen={STARTING_FEN}
        disabled={true}
        onMove={onMove}
      />,
    );

    fireEvent.press(getByLabelText('Chess square e2'));
    fireEvent.press(getByLabelText('Chess square e4'));

    expect(onMove).not.toHaveBeenCalled();
  });

  test('Last-move highlighting works', () => {
    const { getByLabelText } = render(
      <ChessBoard_component
        fen={STARTING_FEN}
        lastMove={{ from: 'e2', to: 'e4' }}
      />,
    );

    const background = (label: string) =>
      StyleSheet.flatten(getByLabelText(label).props.style).backgroundColor;

    expect(background('Chess square e2')).toBe('#C9D957');
    expect(background('Chess square e4')).toBe('#C9D957');
    // d4 is unrelated to the last move.
    expect(background('Chess square d4')).not.toBe('#C9D957');
  });

  test('Invalid FEN produces a safe error state', () => {
    const { getByText } = render(
      <ChessBoard_component fen="not-a-valid-fen" />,
    );

    expect(
      getByText('Unable to display chessboard. Invalid FEN position.'),
    ).toBeTruthy();
  });
});
