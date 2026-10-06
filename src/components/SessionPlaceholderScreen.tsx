import type { PropsWithChildren } from 'react';
import { useState } from "react";
import { ChessBoard } from '@/components/chess/Chessboard';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useSession } from '@/providers/SessionProvider';
import { Chess, Square } from "chess.js";

type SessionPlaceholderScreenProps = PropsWithChildren<{
  title: string;
}>;

/**
 placeholder const -> starting fen
 */
const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  

export function SessionPlaceholderScreen({
  children,
  title,
}: SessionPlaceholderScreenProps) {
  const { session } = useSession();

  const description =
    session.status === 'authenticated'
      ? `Signed in as ${session.user.displayName} (${session.user.role}).`
      : `Session status: ${session.status}.`;

/*placeholder chessboard functions*/
/*creating starting position with starting fen */
 const [position, setPosition] = useState(STARTING_FEN);

  const handleMove = (from: Square, to: Square) => {
    const game = new Chess(position);

    try {
      game.move({
        from: from as Square,
        to: to as Square,
      });

      setPosition(game.fen());

      console.log(`Move: ${from} → ${to}`);
    } catch (error) {
      console.log("Invalid move:", error);
    }
  };


  return (
    <PlaceholderScreen description={description} title={title}>
      {children}
      <ChessBoard
      fen={position}
      orientation="white"
      disabled={false}
      /*placeholder in the meantime*/
      onMove={handleMove}
    />
    </PlaceholderScreen>
  );
}
