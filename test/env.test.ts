import {
  env,
  EnvironmentConfigError,
  parsePublicEnvironment,
} from '@/config/env';

const validEnvironment = {
  appEnv: 'development',
  apiBaseUrl: 'https://api.example.org/v1/',
  chessSocketUrl: 'https://chess.example.org/',
  stockfishSocketUrl: 'https://stockfish.example.org/',
};

const serviceFields = [
  'apiBaseUrl',
  'chessSocketUrl',
  'stockfishSocketUrl',
] as const;

describe('parsePublicEnvironment', () => {
  it.each(['development', 'preview', 'production'] as const)(
    'accepts a valid %s environment and normalizes trailing slashes',
    (appEnv) => {
      expect(parsePublicEnvironment({ ...validEnvironment, appEnv })).toEqual({
        appEnv,
        apiBaseUrl: 'https://api.example.org/v1',
        chessSocketUrl: 'https://chess.example.org',
        stockfishSocketUrl: 'https://stockfish.example.org',
      });
    },
  );

  it('allows HTTP for all local services', () => {
    const local = {
      appEnv: 'development',
      apiBaseUrl: 'http://10.0.2.2:8000',
      chessSocketUrl: 'http://10.0.2.2:3001',
      stockfishSocketUrl: 'http://10.0.2.2:8080',
    };
    expect(parsePublicEnvironment(local)).toEqual(local);
  });

  it('exposes the public service settings through the immutable env object', () => {
    const expected = parsePublicEnvironment({
      appEnv: process.env.EXPO_PUBLIC_APP_ENV,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      chessSocketUrl: process.env.EXPO_PUBLIC_CHESS_SOCKET_URL,
      stockfishSocketUrl: process.env.EXPO_PUBLIC_STOCKFISH_SOCKET_URL,
    });
    expect(env).toEqual(expected);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('trims surrounding whitespace without removing service paths', () => {
    expect(
      parsePublicEnvironment({
        ...validEnvironment,
        chessSocketUrl: '  https://chess.example.org/game/  ',
      }).chessSocketUrl,
    ).toBe('https://chess.example.org/game');
  });

  it.each([undefined, '', 'staging'])(
    'rejects invalid appEnv: %s',
    (appEnv) => {
      expect(() =>
        parsePublicEnvironment({ ...validEnvironment, appEnv }),
      ).toThrow('appEnv');
    },
  );

  describe.each(serviceFields)('%s', (field) => {
    const protocol = 'https';

    it.each([undefined, '', '   ', 'not-a-url', 'https://'])(
      'rejects a missing or malformed value: %s',
      (value) => {
        const parse = () =>
          parsePublicEnvironment({ ...validEnvironment, [field]: value });
        expect(parse).toThrow(EnvironmentConfigError);
        expect(parse).toThrow(field);
      },
    );

    it.each(['preview', 'production'])(
      'requires a secure protocol for %s',
      (appEnv) => {
        expect(() =>
          parsePublicEnvironment({
            ...validEnvironment,
            appEnv,
            [field]: 'http://service.example.org',
          }),
        ).toThrow(`${field} must use HTTPS outside development`);
      },
    );

    it.each(['ftp', 'ws', 'wss'])(
      'rejects the wrong protocol: %s',
      (invalidProtocol) => {
        expect(() =>
          parsePublicEnvironment({
            ...validEnvironment,
            [field]: `${invalidProtocol}://service.example.org`,
          }),
        ).toThrow(`${field} must use HTTP or HTTPS`);
      },
    );

    it.each(['user:private-password@', 'user@', ':private-password@'])(
      'rejects embedded credentials without exposing them',
      (credentials) => {
        const parse = () =>
          parsePublicEnvironment({
            ...validEnvironment,
            [field]: `${protocol}://${credentials}service.example.org`,
          });
        expect(parse).toThrow(`${field} must not contain credentials`);
        expect(parse).not.toThrow('private-password');
      },
    );

    it.each(['?token=private-token', '#section', '?', '#'])(
      'rejects query strings or fragments: %s',
      (suffix) => {
        const parse = () =>
          parsePublicEnvironment({
            ...validEnvironment,
            [field]: `${protocol}://service.example.org${suffix}`,
          });
        expect(parse).toThrow(
          `${field} must not contain a query string or fragment`,
        );
        expect(parse).not.toThrow('private-token');
      },
    );
  });
});
