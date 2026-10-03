export type AppErrorCode = 
    'NETWORK_ERROR' |
    'REQUEST_TIMEOUT' |
    'REQUEST_CANCELLED' |
    'INVALID_RESPONSE' | 
    'SESSION_EXPIRED' |
    'PERMISSION_DENIED' |
    'SERVER_ERROR' |
    'UNKNOWN';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status?: number, // Pass in response.status
  ) {
    super(message);
    this.name = 'AppError';
  }
}