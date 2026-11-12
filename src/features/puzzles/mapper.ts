import type { BackendPuzzle } from './schema';
import type { Puzzle } from './types';

// Converts space-separated backend values into arrays.
// Null, undefined, and blank values become empty arrays.
function splitWords(value: string | null | undefined): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

// Converts a validated backend puzzle into the app-facing Puzzle type.
export function mapPuzzle(puzzle: BackendPuzzle): Puzzle {
  return {
    id: puzzle.puzzleId,
    fen: puzzle.FEN,
    moves: splitWords(puzzle.moves),
    rating: puzzle.rating ?? undefined,
    ratingDeviation: puzzle.ratingDeviation ?? undefined,
    popularity: puzzle.popularity ?? undefined,
    plays: puzzle.nbPlays ?? undefined,
    themes: splitWords(puzzle.themes),
    gameUrl: puzzle.gameUrl ?? undefined,
    openingTags: splitWords(puzzle.openingTags),
  };
}

// Converts a validated array of backend puzzles into an array of the app-facing Puzzle types.
export function mapPuzzles(puzzles: BackendPuzzle[]): Puzzle[] {
  return puzzles.map(mapPuzzle);
}
