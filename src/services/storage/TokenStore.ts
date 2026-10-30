import * as SecureStore from 'expo-secure-store';

// Temporary AppError decloration here until Brandons API code is merged.
export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'REQUEST_CANCEL'
  | 'INVALID_RESPONSE'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

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

const TOKEN_KEY = 'jwt-token';

interface TokenStore {
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  deleteToken: () => Promise<void>;
}

export const tokenStore: TokenStore = {
  async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      throw new AppError('UNKNOWN', 'Failed to get token please retry.');
    }
  },
  async setToken(token: string) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      throw new AppError('UNKNOWN', 'Failed to set token please try again.');
    }
  },
  async deleteToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      throw new AppError('UNKNOWN', 'Failed to delete token please try again.');
    }
  },
};
