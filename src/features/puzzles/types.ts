/**
 * Puzzle type that the rest of the app uses.
 * Produced from the backend response by mapPuzzle();
 */
export type Puzzle = {
  // Backend puzzleID
  id: string;
  // Starting position in FEN notation.
  fen: string;
  // Moves in UCI notation ex. "c2d1".
  // The first move is the opponent's setup move, solution starts from the second move.
  moves: string[];
  rating: number;
  ratingDeviation?: number;
  popularity?: number;
  // Backend nbPlays
  plays?: number;
  // Tag names for involved concepts provided by backend ex. "backRankMate". Empty array if none are provided.
  themes: string[];
  gameUrl?: string;
  // Tag names for chess openings associated with the puzzle provided by backend.
  openingTags: string[];
};
