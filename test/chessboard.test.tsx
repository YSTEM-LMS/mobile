import { render, fireEvent } from '@testing-library/react-native';
import { ChessBoard_component } from '@/components/chess/Chessboard-component';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('ChessBoard_component', () => {
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
    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} orientation="white" />,
    );

    expect(getByLabelText('Chess square a8')).toBeTruthy();
    expect(getByLabelText('Chess square h1')).toBeTruthy();
  });

  test('Black orientation renders correctly', () => {
    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} orientation="black" />,
    );

    expect(getByLabelText('Chess square h1')).toBeTruthy();
    expect(getByLabelText('Chess square a8')).toBeTruthy();
  });

  test('Selecting a piece highlights legal destinations', () => {
    const { getByLabelText } = render(
      <ChessBoard_component fen={STARTING_FEN} />,
    );

    // Select the white pawn on e2.
    fireEvent.press(getByLabelText('Chess square e2'));
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

    expect(getByLabelText('Chess square e2')).toBeTruthy();
    expect(getByLabelText('Chess square e4')).toBeTruthy();
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
