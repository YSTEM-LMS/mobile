// Categories of errors that can occur when retrieving puzzle data.
export type PuzzleDataErrorKind = 'request-failed' | 'invalid-response';

/**
 * Represents errors encountered while retrieving or validating puzzle data.
 * Provides a user-friendly message and preserves the original error for debugging.
 */
export class PuzzleDataError extends Error {
  readonly kind: PuzzleDataErrorKind;
  readonly originalError?: unknown;

  /**
   * Creates a puzzle data error.
   *
   * @param kind - Category of the error.
   * @param message - User-friendly error message.
   * @param originalError - Optional underlying error for debugging.
   */
  constructor(
    kind: PuzzleDataErrorKind,
    message: string,
    originalError?: unknown,
  ) {
    super(message);

    // Ensure instanceof correctly identifies this object as a PuzzleDataError.
    // Fixes potential inheritance issues when JS code is converted for older environments.
    Object.setPrototypeOf(this, PuzzleDataError.prototype);
    this.name = 'PuzzleDataError';
    this.kind = kind;
    this.originalError = originalError;
  }
}
