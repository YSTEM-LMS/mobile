export type StockfishLevel = 1 | 2 | 3 | 4 | 5;

export interface EngineMove {
  move: string; // e.g. "e7e5"
  newFen: string;
}

export interface StockfishClient {
  startSession(): Promise<void>; // connects lazily, then starts the session
  requestMove(input: {
    fen: string;
    move: string;
    level: StockfishLevel;
  }): Promise<EngineMove>;
  disconnect(): void;
}

export type SocketListener = (...args: unknown[]) => void;

export interface StockfishSocket {
  readonly connected: boolean;
  connect(): void;
  disconnect(): void;
  emit(event: string, payload?: unknown): void;
  on(event: string, listener: SocketListener): void;
  off(event: string, listener: SocketListener): void;
}
