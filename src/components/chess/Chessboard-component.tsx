import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chess, Square } from "chess.js";
import {
  fontSizes,
  fontWeights,
  palette,
  radii,
  spacing,
} from '@/design/tokens';


type ChessBoardProps = {
  fen: string;
  orientation?: "white" | "black";
  disabled?: boolean;
  selectedSquare?: Square;
  showLegalMoves?: boolean;
  lastMove?: {
    from: string;
    to: string;
  };
  onMove?: (from: Square, to: Square) => void;
};

type Piece = {
  square: string;
  type: string;
  color: "w" | "b";
};

/*main chessboard function  */
export function ChessBoard_component({
  fen,
  orientation = "white",
  disabled = false,
  selectedSquare,
  showLegalMoves = true,
  lastMove,
  onMove,
}: ChessBoardProps) {
  const [internalSelectedSquare, setInternalSelectedSquare] =
    useState<Square | null>(null);

  /*creates a new game based on the fen position given, no fen returns null, as the game progresses, fen also changes alongside it */
  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  /*creates a board based on the game state, if no game is present, returns an empty array, 
  otherwise it loops through the board and pushes each piece into the pieces array */
  const board = useMemo(() => {
    if (!game) {
      return [];
    }

    const pieces: Piece[] = [];

    for (const row of game.board()) {
      for (const square of row) {
        if (!square) continue;

        pieces.push({
          square: square.square,
          type: square.type,
          color: square.color,
        });
      }
    }

    return pieces;
  }, [game]);


  /*determines which square is currently selected, either from the prop or the internal state */
  const activeSelectedSquare =
    selectedSquare ?? internalSelectedSquare;

  /*determines which squares are legal destinations for the currently selected piece, 
  if no game or no selected square, returns an empty array, 
  otherwise it uses the chess.js library to get the legal moves for the selected square and maps them to their destination squares */
  const legalDestinations = useMemo(() => {
    if (!game || !activeSelectedSquare) {
      return [];
    }

    try {
      return game
        .moves({
          square: activeSelectedSquare,
          verbose: true,
        })
        .map((move) => move.to);
    } catch {
      return []
    }
  }, [game, activeSelectedSquare]);
/*determines the order of the files and ranks based on the orientation prop, 
  if the orientation is white, the files are a-h and the ranks are 8-1, 
 if the orientation is black, the files are h-a and the ranks are 1-8 */
  const files =
    orientation === "white"
      ? ["a", "b", "c", "d", "e", "f", "g", "h"]
      : ["h", "g", "f", "e", "d", "c", "b", "a"];

  const ranks =
    orientation === "white"
      ? ["8", "7", "6", "5", "4", "3", "2", "1"]
      : ["1", "2", "3", "4", "5", "6", "7", "8"];
/*creates an array of all the squares on the board by combining the files and ranks,*/
  const squares: Square[] = ranks.flatMap((rank) =>
    files.map((file) => `${file}${rank}` as Square)
  );
/*returns the piece at the given square, if no piece is present, returns undefined */
  const pieceAt = (square: string) =>
    board.find((piece) => piece.square === square);

  /*handles the logic for when a square is pressed, if the board is disabled or there is no game, it returns early, if a piece is already selected and the pressed square is a legal destination, it calls the onMove callback and clears the selection, 
  if a piece is present on the pressed square and it is the correct turn, it sets the internal selected square to the pressed square, 
  otherwise it clears the selection */
  const handleSquarePress = (square: Square) => {
    if (disabled || !game) {
      return;
    }
    const piece = pieceAt(square);

    // If a piece is already selected and this is a legal destination
    if (
      activeSelectedSquare  &&
      legalDestinations.includes(square) 
    ) {
      onMove?.(activeSelectedSquare, square);
      setInternalSelectedSquare(null);
      return;
    }

    // Select a piece
    if (piece) {
      // Only allow selecting the side whose turn it is
      if (piece.color === game.turn()) {
        setInternalSelectedSquare(square);
        return;
      }
    } 

    // Clicking elsewhere clears selection
    setInternalSelectedSquare(null);
  };

  return (
    
    <View style={styles.wrap}>
      {/* Rank labels */}
    <View style={styles.rankLabels}>
      {ranks.map((rank) => (
        <Text key={rank} style={styles.rankLabel}>
          {rank}
        </Text>
      ))}
    </View>
  {/* Actual board */}
<View style={styles.boardContainer}>
    <View style={styles.board}>
      {squares.map((square, index) => {
        const row = Math.floor(index / 8);
        const column = index % 8;

        const isDark = (row + column) % 2 === 1;

        const piece = pieceAt(square);

        const isSelected =
          activeSelectedSquare === square;

        const isLegalDestination =
          showLegalMoves &&
          legalDestinations.includes(square);

        const isLastMove =
          lastMove?.from === square ||
          lastMove?.to === square;

        return (
          <Pressable
            key={square}
            onPress={() => handleSquarePress(square)}
            accessibilityLabel={`Chess square ${square}`}
            style={[
              styles.square,
              isDark
                ? styles.darkSquare
                : styles.lightSquare,
              isSelected && styles.selectedSquare,
              isLastMove && styles.lastMoveSquare,
            ]}
          >
            {piece && (
              <Text
                style={[
                  styles.piece,
                  piece.color === "b"
                    ? styles.blackPiece
                    : styles.whitePiece,
                ]}
                accessibilityLabel={`${piece.color === "w" ? "White" : "Black"} ${piece.type} on ${square}`}
              >
                {getPieceSymbol(piece.color, piece.type)}
              </Text>
            )}

            {isLegalDestination && (
              <View
                pointerEvents="none"
                style={styles.legalMoveDot}
              />
            )}
          </Pressable>
        );
      })}
    </View>
      {/* File labels */}
    <View style={styles.fileRow}>
        {files.map((file) => (
          <Text key={file} style={styles.fileLabel}>
            {file}
          </Text>
        ))}
      </View>
    </View>
  </View>
  );
}

function getPieceSymbol(
  color: "w" | "b",
  type: string
) {
  const pieces = {
    w: {
      k: "♔",
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
      p: "♙",
    },
    b: {
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟",
    },
  };

  return pieces[color][
    type as keyof typeof pieces.w
  ];
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    //aspectRatio: 1,
    flexDirection: "row",
  },

  rankLabels: {
    justifyContent: "space-around",
    paddingRight: 4,
    paddingBottom: 18,
  },

  rankLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },

  boardContainer: {
    flex: 1,
  },

  board: {
    width: "100%",
    aspectRatio: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
    borderRadius: radii.md,
  },

  square: {
    width: "12.5%",
    height: "12.5%",
    alignItems: "center",
    justifyContent: "center",
  },

  lightSquare: {
    backgroundColor: "#F0D9B5",
  },

  darkSquare: {
    backgroundColor: "#B58863",
  },

  selectedSquare: {
    backgroundColor: "#F6F669",
  },

  lastMoveSquare: {
    backgroundColor: "#C9D957",
  },

  piece: {
    fontSize: fontSizes.display,
    lineHeight: 48,
  },

  whitePiece: {
    color: "#FFFFFF",
  },

  blackPiece: {
    color: "#000000",
  },

  legalMoveDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  fileRow: {
    width: "100%",
    flexDirection: "row",
    height: 18,
  },

  fileLabel: {
    flex: 1,
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    fontWeight: fontWeights.bold,
    textAlign: "center",
    paddingTop: 4,
  },
});
