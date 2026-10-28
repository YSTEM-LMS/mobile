import { renderHook, act } from '@testing-library/react-native';
import { Chess } from 'chess.js';
import { useChessGame } from '@/components/chess/useChessGame';

// White pawn on a7, white king a1, black king h7. White to move.
const WHITE_PROMOTION_FEN = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
// Black pawn on a2, black king h8, white king h2. Black to move.
const BLACK_PROMOTION_FEN = '7k/8/8/8/8/8/p6K/8 b - - 0 1';

describe('useChessGame pawn promotion', () => {
  test('White pawn reaching the final rank promotes to a white queen', () => {
    const { result } = renderHook(() => useChessGame(WHITE_PROMOTION_FEN));

    let returned: string | null = null;
    act(() => {
      returned = result.current.handleMove('a7', 'a8');
    });

    expect(returned).not.toBeNull();
    expect(result.current.position).toBe(returned);
    expect(result.current.position).not.toBe(WHITE_PROMOTION_FEN);
    expect(result.current.lastMove).toEqual({ from: 'a7', to: 'a8' });

    const game = new Chess(result.current.position);
    expect(game.get('a8')).toEqual({ type: 'q', color: 'w' });
    expect(game.get('a7')).toBeFalsy();
  });

  test('Black pawn reaching the final rank promotes to a black queen', () => {
    const { result } = renderHook(() => useChessGame(BLACK_PROMOTION_FEN));

    let returned: string | null = null;
    act(() => {
      returned = result.current.handleMove('a2', 'a1');
    });

    expect(returned).not.toBeNull();
    expect(result.current.position).toBe(returned);
    expect(result.current.position).not.toBe(BLACK_PROMOTION_FEN);
    expect(result.current.lastMove).toEqual({ from: 'a2', to: 'a1' });

    const game = new Chess(result.current.position);
    expect(game.get('a1')).toEqual({ type: 'q', color: 'b' });
    expect(game.get('a2')).toBeFalsy();
  });
});
