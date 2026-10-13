/**
 * Puzzle type that the rest of the app uses.
 * Produced from the backend response by mapPuzzle();
 */
export type Puzzle = {
  // Backend puzzleID
  id: string;
  // Starting position in FEN notation.
  fen: string;
  // Solution moves in order, as "from-square+to-square" ex. "c2d1".
  moves: string[];
  rating: number;
  ratingDeviation?: number;
  popularity?: number;
  // Backend nbPlays
  plays?: number;
  // Tag names provided by backend ex. "backRankMate". Empty array if none are provided.
  themes: string[];
  gameUrl?: string;
  openingTags: string[];
};
