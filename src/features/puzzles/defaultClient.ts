import { apiClient } from '@/services/api/apiClient';
import type { PuzzleApiClient } from './api';

/**
 * Default API client used by the puzzle query hook.
 * Uses the sharped API client for real puzzle requests.
 */
export const defaultPuzzleClient: PuzzleApiClient = apiClient;
