
import { useState } from "react";
import { Chess, Square } from "chess.js";

export function useChessGame(initialFen: string) {
  const [position, setPosition] = useState(initialFen);
   const [lastMove, setLastMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const handleMove = (from: Square, to: Square) => {
    try {
      const game = new Chess(position);

      game.move({
        from,
        to,
      });

      const nextPosition = game.fen();

      setPosition(nextPosition);

      // Save the most recent successful move
      setLastMove({ from, to });

      console.log(`Move: ${from} → ${to}`);

      return nextPosition;
    } catch (error) {
      console.log("Invalid move:", error);
      return null;
    }
  };

  const resetGame = (fen: string) => {
    setPosition(fen);
    setLastMove(null);
  };

  return {
    position,
    lastMove,
    handleMove,
    resetGame,
  };
}
