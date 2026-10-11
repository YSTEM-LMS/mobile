import { z } from 'zod';

const serviceUrl = z.string().trim().min(1).url();

const publicEnvironmentSchema = z.object({
  appEnv: z.enum(['development', 'preview', 'production']),
  apiBaseUrl: serviceUrl,
  stockfishSocketUrl: serviceUrl,
});

export type AppEnvironment = z.infer<typeof publicEnvironmentSchema>['appEnv'];

export interface PublicEnvironment {
  appEnv: AppEnvironment;
  apiBaseUrl: string;
  stockfishSocketUrl: string;
}

export class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigError';
  }
}

interface PublicEnvironmentInput {
  appEnv?: string;
  apiBaseUrl?: string;
  stockfishSocketUrl?: string;
}

function invalidConfiguration(details: string): EnvironmentConfigError {
  return new EnvironmentConfigError(
    `Invalid public environment configuration: ${details}`,
  );
}

function validateServiceUrl(
  field: string,
  value: string,
  appEnv: AppEnvironment,
): string {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalidConfiguration(`${field} must use HTTP or HTTPS`);
  }

  if (appEnv !== 'development' && url.protocol !== 'https:') {
    throw invalidConfiguration(`${field} must use HTTPS outside development`);
  }

  if (url.username || url.password) {
    throw invalidConfiguration(`${field} must not contain credentials`);
  }

  if (url.search || url.hash) {
    throw invalidConfiguration(
      `${field} must not contain a query string or fragment`,
    );
  }

  return url.toString().replace(/\/+$/, '');
}

export function parsePublicEnvironment(
  input: PublicEnvironmentInput,
): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const field = issue.path.join('.') || 'environment';
        return `${field}: ${issue.message}`;
      })
      .join('; ');

    throw invalidConfiguration(details);
  }

  const { appEnv } = result.data;

  return Object.freeze({
    appEnv,
    apiBaseUrl: validateServiceUrl(
      'apiBaseUrl',
      result.data.apiBaseUrl,
      appEnv,
    ),
    stockfishSocketUrl: validateServiceUrl(
      'stockfishSocketUrl',
      result.data.stockfishSocketUrl,
      appEnv,
    ),
  });
}

export const env = parsePublicEnvironment({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  stockfishSocketUrl: process.env.EXPO_PUBLIC_STOCKFISH_SOCKET_URL,
});
