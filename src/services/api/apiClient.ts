import { fetch } from 'expo/fetch';
import { env } from '@/config/env';
import {
  ApiClientInterface,
  TokenProvider,
  ApiClientOptions,
  RequestOptions,
} from '../../types/apiClient.types';
import { AppError } from './apiError';
import { tokenStore } from '../storage/TokenStore';

// 10 second timeout
export const REQUEST_TIMEOUT_MS = 10_000;

class ApiClient implements ApiClientInterface {
  private apiBaseUrl: string;
  private readonly tokenProvider?: TokenProvider;
  private timeoutMs: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions) {
    this.apiBaseUrl = options.baseUrl;
    this.tokenProvider = options.tokenProvider;
    this.timeoutMs = options.timeoutMs;
    this.defaultHeaders = { 'Content-Type': 'application/json' };
  }

  // Helper function to catch errors when fetching token
  private async getToken(): Promise<string | null> {
    try {
      return (await this.tokenProvider?.()) ?? null;
    } catch {
      throw new AppError('UNKNOWN', 'The request cannot be completed.');
    }
  }

  // Request url assumes endpoint has a '/'
  // e.g. ('/puzzles')
  private async request<T>(
    endpoint: string,
    options: RequestInit,
    responseType: 'json' | 'text' = 'json',
  ): Promise<T | string | null> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    const controller = new AbortController();
    let abortReason: 'timeout' | 'cancel' | null = null;

    const abortRequest = (reason: 'timeout' | 'cancel') => {
      if (!controller.signal.aborted) {
        abortReason = reason;
        controller.abort();
      }
    };

    // Create this abort as a const so it can be removed as an event listener
    const handleCancellation = () => {
      abortRequest('cancel');
    };

    if (options.signal?.aborted) {
      handleCancellation();
    } else {
      options.signal?.addEventListener('abort', handleCancellation, {
        once: true,
      });
    }

    const timeoutId = setTimeout(() => {
      abortRequest('timeout');
    }, this.timeoutMs);

    let handleAbort: (() => void) | undefined;

    const abortPromise = new Promise<never>((_resolve, reject) => {
      handleAbort = () => {
        reject(new Error('Request aborted'));
      };

      if (controller.signal.aborted) {
        handleAbort();
      } else {
        controller.signal.addEventListener('abort', handleAbort, {
          once: true,
        });
      }
    });

    try {
      // Race that allow abort process to concurrently run, even if the token process hangs
      const token = await Promise.race([this.getToken(), abortPromise]);
      const headers = new Headers(this.defaultHeaders);

      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });

      headers.set(
        'Accept',
        responseType === 'text' ? 'text/plain' : 'application/json',
      );
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      // Response failed
      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new AppError(
              'SESSION_EXPIRED',
              'Your session has expired.',
              response.status,
            );
          case 403:
            throw new AppError(
              'PERMISSION_DENIED',
              'You do not have permission to perform this action.',
              response.status,
            );
          default:
            throw new AppError(
              'SERVER_ERROR',
              'The server could not complete the request.',
              response.status,
            );
        }
      }

      const responseText = await response.text();
      if (responseText.trim() === '') {
        return null;
      }

      if (responseType === 'text') {
        return responseText;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch {
        throw new AppError(
          'INVALID_RESPONSE',
          'The server returned an invalid response.',
          response.status,
        );
      }
    } catch (error) {
      // Errors that aren't defined in AppErrors will throw NETWORK_ERROR instead
      if (error instanceof AppError) {
        throw error;
      }

      // Aborting fetch does not generate AppErrors, so we need to manually throw new AppErrors
      if (abortReason === 'timeout') {
        throw new AppError(
          'REQUEST_TIMEOUT',
          'The request took too long to complete.',
        );
      }
      if (abortReason === 'cancel') {
        throw new AppError('REQUEST_CANCEL', 'The request was cancelled.');
      }

      // Fallback error throw since there is no HTTP status for network connection
      throw new AppError('NETWORK_ERROR', 'Unable to connect to the server.');
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', handleCancellation);

      if (handleAbort) {
        controller.signal.removeEventListener('abort', handleAbort);
      }
    }
  }

  get<T>(
    endpoint: string,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  get(
    endpoint: string,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
  get<T>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T | string | null> {
    const { responseType = 'json', ...requestOptions } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...requestOptions, method: 'GET' },
      responseType,
    );
  }

  post<T, B = unknown>(
    endpoint: string,
    body: B,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  post(
    endpoint: string,
    body: unknown,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
  post<T, B = unknown>(
    endpoint: string,
    body: B,
    options?: RequestOptions,
  ): Promise<T | string | null> {
    const { responseType = 'json', ...requestOptions } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...requestOptions, method: 'POST', body: JSON.stringify(body) },
      responseType,
    );
  }

  put<T, B = unknown>(
    endpoint: string,
    body: B,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  put(
    endpoint: string,
    body: unknown,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
  put<T, B = unknown>(
    endpoint: string,
    body: B,
    options?: RequestOptions,
  ): Promise<T | string | null> {
    const { responseType = 'json', ...requestOptions } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...requestOptions, method: 'PUT', body: JSON.stringify(body) },
      responseType,
    );
  }

  delete<T>(
    endpoint: string,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  delete(
    endpoint: string,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
  delete<T>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T | string | null> {
    const { responseType = 'json', ...requestOptions } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...requestOptions, method: 'DELETE' },
      responseType,
    );
  }
}

// A factory to expose constructor
export function createApiClient(options: ApiClientOptions): ApiClientInterface {
  return new ApiClient(options);
}

export const apiClient = createApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: REQUEST_TIMEOUT_MS,
  tokenProvider: tokenStore.getToken,
});
