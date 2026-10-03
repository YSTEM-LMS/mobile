import { fetch } from 'expo/fetch';
import { env } from '@/config/env';
import {
  ApiClientInterface,
  TokenProvider,
  ApiClientOptions,
  RequestOptions,
} from '../../types/apiClient.types';
import { AppError } from './apiError';

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

  private async request<T>(
    endpoint: string,
    options: RequestInit,
  ): Promise<T | null> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const token = await this.tokenProvider?.();

    const headers = new Headers(this.defaultHeaders);
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });

    headers.set('Accept', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(url, { ...options, headers });
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  post<T, B>(endpoint: string, body: B, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T, B>(endpoint: string, body: B, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: 10_000, // 10 second timeout
});
