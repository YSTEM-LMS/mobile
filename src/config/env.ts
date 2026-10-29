import { z } from 'zod';

const serviceUrl = z.string().trim().min(1).url();

const publicEnvironmentSchema = z.object({
  appEnv: z.enum(['development', 'preview', 'production']),
  apiBaseUrl: serviceUrl,
  chessSocketUrl: serviceUrl,
  stockfishSocketUrl: serviceUrl,
});

export class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(`Invalid public environment configuration: ${message}`);
    this.name = 'EnvironmentConfigError';
  }
}

export function parsePublicEnvironment(input: unknown) {
  // Check required values and URL syntax first.
  const result = publicEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const field = issue.path.join('.') || 'environment';
        return `${field}: ${issue.message}`;
      })
      .join('; ');

    throw new EnvironmentConfigError(details);
  }

  const config = result.data;

  // Apply the same service-address rules to each URL.
  function checkUrl(value: string, field: string) {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new EnvironmentConfigError(`${field} must use HTTP or HTTPS`);
    }

    if (config.appEnv !== 'development' && url.protocol !== 'https:') {
      throw new EnvironmentConfigError(
        `${field} must use HTTPS outside development`,
      );
    }

    if (url.username || url.password) {
      throw new EnvironmentConfigError(`${field} must not contain credentials`);
    }

    if (value.includes('?') || value.includes('#')) {
      throw new EnvironmentConfigError(
        `${field} must not contain a query string or fragment`,
      );
    }

    return url.toString().replace(/\/+$/, '');
  }

  return Object.freeze({
    appEnv: config.appEnv,
    apiBaseUrl: checkUrl(config.apiBaseUrl, 'apiBaseUrl'),
    chessSocketUrl: checkUrl(config.chessSocketUrl, 'chessSocketUrl'),
    stockfishSocketUrl: checkUrl(
      config.stockfishSocketUrl,
      'stockfishSocketUrl',
    ),
  });
}

export const env = parsePublicEnvironment({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  chessSocketUrl: process.env.EXPO_PUBLIC_CHESS_SOCKET_URL,
  stockfishSocketUrl: process.env.EXPO_PUBLIC_STOCKFISH_SOCKET_URL,
});
