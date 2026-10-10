import { useState } from "react";
import { Chess, Square } from "chess.js";

export function useChessGame(initialFen: string) {
  const [position, setPosition] = useState(initialFen);

  const handleMove = (from: Square, to: Square) => {
    const game = new Chess(position);

    try {
      game.move({
        from,
        to,
      });

      const nextPosition = game.fen();

      setPosition(nextPosition);

      return nextPosition;
    } catch (error) {
      console.log("Invalid move:", error);
      return null;
    }
  };

  const resetGame = (fen: string) => {
    setPosition(fen);
  };

  return {
    position,
    handleMove,
    resetGame,
  };
}