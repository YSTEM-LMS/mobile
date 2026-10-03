export type TokenProvider = () => Promise<string | null>;

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

export interface RequestOptions {
    signal?: AbortSignal;
    headers?: Record<string, string>;
}

// Promise: Successful JSON -> T
// Promise: Successful empty response -> Null
export interface ApiClientInterface {
    get<T>(endpoint: string, options?: RequestOptions): Promise<T | null>;
    post<T, B = unknown>(endpoint: string, body: B, options?: RequestOptions): Promise<T | null>;
    put<T, B = unknown>(endpoint: string, body: B, options?: RequestOptions): Promise<T | null>;
    delete<T>(endpoint: string, options?: RequestOptions): Promise<T | null>;
};