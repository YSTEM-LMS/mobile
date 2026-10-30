export type ProfileErrorKind = 'network' | 'invalid-data' | 'session-expired';

export class ProfileError extends Error {
  constructor(
    public kind: ProfileErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}
