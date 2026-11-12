export type TokenProvider = () => Promise<string | null>;

export interface ApiClientOptions {
  baseUrl: string;
  tokenProvider?: TokenProvider;
  timeoutMs: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
}

// Promise: Successful JSON -> T
// Promise: Successful empty response -> Null
export interface ApiClientInterface {
  get<T>(
    endpoint: string,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  get(
    endpoint: string,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
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
  delete<T>(
    endpoint: string,
    options?: RequestOptions & { responseType?: 'json' },
  ): Promise<T | null>;
  delete(
    endpoint: string,
    options: RequestOptions & { responseType: 'text' },
  ): Promise<string | null>;
}
