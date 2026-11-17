import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { standardPieces } from '@/assets/chess-pieces/standard';
import { fontWeights, radii, spacing } from '@/design/tokens';

type ChessBoardProps = {
  fen: string;
  orientation?: 'white' | 'black';
  disabled?: boolean;
  selectedSquare?: Square;
  showLegalMoves?: boolean;
  lastMove?: {
    from: string;
    to: string;
  };
  labels?: boolean;
  onMove?: (from: Square, to: Square) => void;
};

type Piece = {
  square: Square;
  type: PieceSymbol;
  color: 'w' | 'b';
};

type DragContext = {
  fen: string;
  orientation: 'white' | 'black';
  size: number;
  enabled: boolean;
};

function squareAt(x: number, y: number, size: number, squares: Square[]) {
  'worklet';
  if (size <= 0 || x < 0 || y < 0 || x >= size || y >= size) return undefined;
  const cell = size / 8;
  return squares[Math.floor(y / cell) * 8 + Math.floor(x / cell)];
}

function legalMovesFrom(game: Chess | null, from: Square | null) {
  if (!game || !from) return [];
  return game.moves({ square: from, verbose: true }).map((move) => move.to);
}

function PieceArtwork({ piece }: { piece: Piece }) {
  const key = (piece.color +
    piece.type.toUpperCase()) as keyof typeof standardPieces;
  return <SvgXml xml={standardPieces[key]} width="100%" height="100%" />;
}
export function ChessBoard_component({
  fen,
  orientation = 'white',
  disabled = false,
  selectedSquare,
  showLegalMoves = true,
  lastMove,
  labels = true,
  onMove,
}: ChessBoardProps) {
  const [internalSelectedSquare, setInternalSelectedSquare] =
    useState<Square | null>(null);
  const [size, setSize] = useState(0);
  const [drag, setDrag] = useState<{
    from: Square;
    context: DragContext;
  } | null>(null);
  const initialTouch = useSharedValue<{
    from: Square;
    context: DragContext;
  } | null>(null);
  const translation = useSharedValue({ x: 0, y: 0 });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translation.get().x },
      { translateY: translation.get().y },
    ],
  }));

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

  /*determines the order of the files and ranks based on the orientation prop, 
  if the orientation is white, the files are a-h and the ranks are 8-1, 
 if the orientation is black, the files are h-a and the ranks are 1-8 */
  const files =
    orientation === 'white'
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const ranks =
    orientation === 'white'
      ? ['8', '7', '6', '5', '4', '3', '2', '1']
      : ['1', '2', '3', '4', '5', '6', '7', '8'];
  /*creates an array of all the squares on the board by combining the files and ranks,*/
  const squares: Square[] = ranks.flatMap((rank) =>
    files.map((file) => `${file}${rank}` as Square),
  );
  /*returns the piece at the given square, if no piece is present, returns undefined */
  const pieceAt = (square: string) =>
    board.find((piece) => piece.square === square);

  const enabled = !disabled && !!onMove;
  const context = { fen, orientation, size, enabled };
  const contextMatches = (previous: DragContext) =>
    enabled &&
    previous.fen === fen &&
    previous.orientation === orientation &&
    previous.size === size;
  const visibleDrag = drag && contextMatches(drag.context) ? drag.from : null;
  const activeSelectedSquare =
    visibleDrag ?? selectedSquare ?? internalSelectedSquare;
  const legalDestinations = useMemo(
    () => legalMovesFrom(game, activeSelectedSquare),
    [game, activeSelectedSquare],
  );

  const submitMove = (from: Square, to: Square) => {
    if (disabled || !legalMovesFrom(game, from).includes(to)) return false;
    onMove?.(from, to);
    setInternalSelectedSquare(null);
    return true;
  };

  // Gesture callbacks can arrive after the parent has updated the board.
  const latest = useRef({ contextMatches, submitMove });
  useLayoutEffect(() => {
    latest.current = { contextMatches, submitMove };
  });

  const startDrag = useCallback((from: Square, startedOn: DragContext) => {
    if (latest.current.contextMatches(startedOn))
      setDrag({ from, context: startedOn });
  }, []);

  const finishDrag = useCallback(
    (from: Square, startedOn: DragContext, to: Square | undefined) => {
      setDrag(null);
      if (to && latest.current.contextMatches(startedOn))
        latest.current.submitMove(from, to);
    },
    [],
  );

  const movableSquares = board
    .filter((piece) => piece.color === game?.turn())
    .map((piece) => piece.square);
  const pan = Gesture.Pan()
    .withTestId('chessboard-drag')
    .enabled(enabled && !!game && size > 0)
    .activateAfterLongPress(120)
    .maxPointers(1)
    .onTouchesDown(({ changedTouches }, manager) => {
      const touch = changedTouches[0];
      const from = touch && squareAt(touch.x, touch.y, size, squares);
      if (!from || !movableSquares.includes(from)) manager.fail();
    })
    .onBegin(({ x, y }) => {
      const from = squareAt(x, y, size, squares);
      initialTouch.set(
        from && movableSquares.includes(from) ? { from, context } : null,
      );
      translation.set({ x: 0, y: 0 });
    })
    // The native gesture runs this callback later and schedules the ref read on the JS thread.
    // eslint-disable-next-line react-hooks/refs
    .onStart(() => {
      const touch = initialTouch.get();
      if (touch) scheduleOnRN(startDrag, touch.from, touch.context);
    })
    .onUpdate(({ translationX, translationY }) => {
      translation.set({ x: translationX, y: translationY });
    })
    // eslint-disable-next-line react-hooks/refs
    .onFinalize(({ x, y }, success) => {
      const touch = initialTouch.get();
      initialTouch.set(null);
      if (touch) {
        const to = success ? squareAt(x, y, size, squares) : undefined;
        scheduleOnRN(finishDrag, touch.from, touch.context, to);
      }
    });

  const draggedPiece = visibleDrag ? pieceAt(visibleDrag) : undefined;
  const draggedIndex = visibleDrag ? squares.indexOf(visibleDrag) : -1;

  const handleSquarePress = (square: Square) => {
    if (disabled || !game || visibleDrag) return;
    if (activeSelectedSquare && submitMove(activeSelectedSquare, square))
      return;
    setInternalSelectedSquare(
      pieceAt(square)?.color === game.turn() ? square : null,
    );
  };

  /*visable error when catching invalid fen */
  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Unable to display chessboard. Invalid FEN position.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Rank labels */}
      {labels && (
        <View style={styles.rankLabels}>
          {ranks.map((rank) => (
            <Text key={rank} style={styles.rankLabel}>
              {rank}
            </Text>
          ))}
        </View>
      )}
      {/* Actual board */}
      <View style={styles.boardContainer}>
        <GestureDetector gesture={pan}>
          <View
            testID="chessboard-grid"
            onLayout={({ nativeEvent }) => setSize(nativeEvent.layout.width)}
            style={styles.board}
          >
            {squares.map((square, index) => {
              const row = Math.floor(index / 8);
              const column = index % 8;

              const isDark = (row + column) % 2 === 1;

              const piece = pieceAt(square);

              const isSelected = activeSelectedSquare === square;

              const isLegalDestination =
                showLegalMoves && legalDestinations.includes(square);

              const isLastMove =
                lastMove?.from === square || lastMove?.to === square;

              return (
                <Pressable
                  key={square}
                  onPress={() => handleSquarePress(square)}
                  accessibilityLabel={`Chess square ${square}`}
                  style={[
                    styles.square,
                    isDark ? styles.darkSquare : styles.lightSquare,
                    isSelected && styles.selectedSquare,
                    isLastMove && styles.lastMoveSquare,
                  ]}
                >
                  {piece && (
                    <View
                      accessible
                      accessibilityRole="image"
                      pointerEvents="none"
                      style={[
                        styles.piece,
                        visibleDrag === square && styles.hiddenPiece,
                      ]}
                      accessibilityLabel={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type} on ${square}`}
                    >
                      <PieceArtwork piece={piece} />
                    </View>
                  )}

                  {isLegalDestination && (
                    <View
                      pointerEvents="none"
                      testID={`legal-move-${square}`}
                      style={styles.legalMoveDot}
                    />
                  )}
                </Pressable>
              );
            })}
            {draggedPiece && (
              <Animated.View
                pointerEvents="none"
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={[
                  styles.draggedPiece,
                  {
                    left: (draggedIndex % 8) * (size / 8),
                    top: Math.floor(draggedIndex / 8) * (size / 8),
                  },
                  dragStyle,
                ]}
              >
                <PieceArtwork piece={draggedPiece} />
              </Animated.View>
            )}
          </View>
        </GestureDetector>
        {/* File labels */}

        {labels && (
          <View style={styles.fileRow}>
            {files.map((file) => (
              <Text key={file} style={styles.fileLabel}>
                {file}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    //aspectRatio: 1,
    flexDirection: 'row',
  },

  rankLabels: {
    justifyContent: 'space-around',
    paddingRight: 4,
    paddingBottom: 18,
  },

  rankLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },

  boardContainer: {
    flex: 1,
  },

  board: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: radii.md,
  },

  square: {
    width: '12.5%',
    height: '12.5%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lightSquare: {
    backgroundColor: '#F0D9B5',
  },

  darkSquare: {
    backgroundColor: '#B58863',
  },

  selectedSquare: {
    backgroundColor: '#F6F669',
  },

  lastMoveSquare: {
    backgroundColor: '#C9D957',
  },

  piece: {
    width: '100%',
    height: '100%',
  },

  hiddenPiece: {
    opacity: 0,
  },

  draggedPiece: {
    position: 'absolute',
    width: '12.5%',
    height: '12.5%',
    zIndex: 1,
  },

  legalMoveDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  fileRow: {
    width: '100%',
    flexDirection: 'row',
    height: 18,
  },

  fileLabel: {
    flex: 1,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    paddingTop: 4,
  },

  errorContainer: {
    width: '100%',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});
