import type { BackendPuzzle } from './schema';
import type { Puzzle } from './types';

// Converts space-separated backend values into arrays.
// Missing or blank optional fields become empty arrays.
function splitWords(value: string | undefined): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

// Converts a validated backend puzzle into the app-facing Puzzle type.
export function mapPuzzle(puzzle: BackendPuzzle): Puzzle {
  return {
    id: puzzle.puzzleId,
    fen: puzzle.FEN,
    moves: splitWords(puzzle.moves),
    rating: puzzle.rating,
    ratingDeviation: puzzle.ratingDeviation,
    popularity: puzzle.popularity,
    plays: puzzle.nbPlays,
    themes: splitWords(puzzle.themes),
    gameUrl: puzzle.gameUrl,
    openingTags: splitWords(puzzle.openingTags),
  };
}

// Converts a validated array of backend puzzles into an array of the app-facing Puzzle types.
export function mapPuzzles(puzzles: BackendPuzzle[]): Puzzle[] {
  return puzzles.map(mapPuzzle);
}
