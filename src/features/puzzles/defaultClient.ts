import type { PuzzleApiClient } from "./api";
import { createFakePuzzleClient } from "./fakeClient";

/**
 * Default API client used by the puzzle query hook.
 * Uses a fake client until Brandon's API client is available.
 */
export const defaultPuzzleClient: PuzzleApiClient = createFakePuzzleClient({ delayMs: 400 })