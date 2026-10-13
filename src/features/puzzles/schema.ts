import { z } from 'zod';
/**
 * Defines the structure and validation rules for puzzle data received from the YSTEM backend (GET /puzzles/random).
 * Uses backend's original field names.
 * Backend data must be converted to the app-facing Puzzle type before being used in UI components.
 */
export const backendPuzzleSchema = z.object({
  puzzleId: z.string().min(1),
  FEN: z.string().min(1),
  moves: z.string().min(1),
  rating: z.number(),
  ratingDeviation: z.number().optional(),
  popularity: z.number().optional(),
  nbPlays: z.number().optional(),
  themes: z.string().optional(),
  gameUrl: z.string().optional(),
  openingTags: z.string().optional(),
});

// Validates an array of backend puzzle objects.
export const backendPuzzlesResponseSchema = z.array(backendPuzzleSchema);

// TypeScript type inferred from the schema, representing the structure of a backend puzzle.
export type BackendPuzzle = z.infer<typeof backendPuzzleSchema>;
