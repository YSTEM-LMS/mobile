export interface AuthGateway {
  login: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  validate: (token: string) => Promise<boolean>;
}

export type LoginResponse = { token: string };
