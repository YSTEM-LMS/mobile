import { EnvironmentConfigError, parsePublicEnvironment } from '@/config/env';

const stockfishSocketUrl = 'https://stockfish.example.org';

describe('parsePublicEnvironment', () => {
  it.each(['development', 'preview', 'production'] as const)(
    'accepts a valid %s environment',
    (appEnv) => {
      expect(
        parsePublicEnvironment({
          appEnv,
          apiBaseUrl: 'https://api.example.org/v1/',
          stockfishSocketUrl,
        }),
      ).toEqual({
        appEnv,
        apiBaseUrl: 'https://api.example.org/v1',
        stockfishSocketUrl,
      });
    },
  );

  it('allows HTTP for local development', () => {
    expect(
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'http://10.0.2.2:8000',
        stockfishSocketUrl: 'http://10.0.2.2:8080',
      }),
    ).toEqual({
      appEnv: 'development',
      apiBaseUrl: 'http://10.0.2.2:8000',
      stockfishSocketUrl: 'http://10.0.2.2:8080',
    });
  });

  it.each(['preview', 'production'] as const)(
    'rejects HTTP for %s',
    (appEnv) => {
      expect(() =>
        parsePublicEnvironment({
          appEnv,
          apiBaseUrl: 'http://api.example.org',
          stockfishSocketUrl,
        }),
      ).toThrow('apiBaseUrl must use HTTPS outside development');
    },
  );

  it.each([
    [{ apiBaseUrl: 'https://api.example.org' }, 'appEnv'],
    [{ appEnv: 'development' }, 'apiBaseUrl'],
    [{ appEnv: 'staging', apiBaseUrl: 'https://api.example.org' }, 'appEnv'],
    [{ appEnv: 'development', apiBaseUrl: 'not-a-url' }, 'apiBaseUrl'],
  ])('rejects missing or malformed values', (input, expectedField) => {
    expect(() => parsePublicEnvironment(input)).toThrow(EnvironmentConfigError);
    expect(() => parsePublicEnvironment(input)).toThrow(expectedField);
  });

  it('rejects credentials embedded in the API URL', () => {
    expect(() =>
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'https://user:password@api.example.org',
        stockfishSocketUrl,
      }),
    ).toThrow('apiBaseUrl must not contain credentials');
  });

  it('rejects non-HTTP API URLs', () => {
    expect(() =>
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'ftp://api.example.org',
        stockfishSocketUrl,
      }),
    ).toThrow('apiBaseUrl must use HTTP or HTTPS');
  });

  it('rejects query strings and fragments in the API URL', () => {
    expect(() =>
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'https://api.example.org?token=public#section',
        stockfishSocketUrl,
      }),
    ).toThrow('apiBaseUrl must not contain a query string or fragment');
  });

  it('accepts and normalizes the Stockfish socket URL', () => {
    expect(
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'http://10.0.2.2:8000',
        stockfishSocketUrl: 'http://10.0.2.2:8080/',
      }).stockfishSocketUrl,
    ).toBe('http://10.0.2.2:8080');
  });

  it('rejects a missing Stockfish socket URL', () => {
    expect(() =>
      parsePublicEnvironment({
        appEnv: 'development',
        apiBaseUrl: 'http://10.0.2.2:8000',
      }),
    ).toThrow('stockfishSocketUrl');
  });

  it('rejects an HTTP Stockfish socket URL in production', () => {
    expect(() =>
      parsePublicEnvironment({
        appEnv: 'production',
        apiBaseUrl: 'https://api.example.org',
        stockfishSocketUrl: 'http://stockfish.example.org',
      }),
    ).toThrow('stockfishSocketUrl must use HTTPS outside development');
  });
});
