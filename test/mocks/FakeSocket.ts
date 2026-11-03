import type {
  SocketListener,
  StockfishSocket,
} from '@/features/play/services/StockfishClient';

export interface EmittedEvent {
  event: string;
  payload: unknown;
}

export class FakeSocket implements StockfishSocket {
  connected = false;
  connectCalls = 0;
  disconnectCalls = 0;
  readonly emitted: EmittedEvent[] = [];
  private readonly listeners = new Map<string, SocketListener[]>();

  // ----- Part 1: the socket interface (called by the client) -----

  connect(): void {
    // Only record the call. The test decides when (or whether) the
    // connection succeeds, using simulateConnect / simulateConnectError.
    this.connectCalls += 1;
  }

  disconnect(): void {
    this.disconnectCalls += 1;
    if (this.connected) {
      this.connected = false;
      // A real socket fires 'disconnect' with this reason.
      this.serverEmit('disconnect', 'io client disconnect');
    }
  }

  emit(event: string, payload?: unknown): void {
    this.emitted.push({ event, payload });
  }

  on(event: string, listener: SocketListener): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  off(event: string, listener: SocketListener): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const index = list.indexOf(listener);
    if (index !== -1) list.splice(index, 1);
  }

  // ----- Part 2: test controls (called by tests) -----

  /** Pretend the server sent an event. */
  serverEmit(event: string, ...args: unknown[]): void {
    const current = [...(this.listeners.get(event) ?? [])];
    current.forEach((listener) => listener(...args));
  }

  simulateConnect(): void {
    this.connected = true;
    this.serverEmit('connect');
  }

  simulateConnectError(message = 'Connection refused'): void {
    this.serverEmit('connect_error', new Error(message));
  }

  /** Listeners for one event, or for all events if no name is given. */
  listenerCount(event?: string): number {
    if (event !== undefined) return this.listeners.get(event)?.length ?? 0;
    let total = 0;
    this.listeners.forEach((list) => (total += list.length));
    return total;
  }

  /** Payloads of every emit with this event name, in order. */
  payloadsFor(event: string): unknown[] {
    return this.emitted
      .filter((entry) => entry.event === event)
      .map((entry) => entry.payload);
  }
}
