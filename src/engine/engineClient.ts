export type BestMoveResult = { move: string; eval: number | null };

export type EngineWorker = {
  postMessage: (data: unknown) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  terminate: () => void;
};

type PendingEntry = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type EngineMessage =
  | { id: string; type: 'ready' }
  | { id: string; type: 'eloSet'; elo: number }
  | { id: string; type: 'bestMove'; move: string; eval: number | null }
  | { id: string; type: 'evaluation'; eval: number | null }
  | { id: string; type: 'error'; message: string };

type EngineRequest =
  | { id: string; type: 'init' }
  | { id: string; type: 'setElo'; elo: number }
  | { id: string; type: 'bestMove'; fen: string; movetime?: number; depth?: number }
  | { id: string; type: 'evaluate'; fen: string; movetime?: number; depth?: number };

type EngineRequestWithoutId =
  | { type: 'init' }
  | { type: 'setElo'; elo: number }
  | { type: 'bestMove'; fen: string; movetime?: number; depth?: number }
  | { type: 'evaluate'; fen: string; movetime?: number; depth?: number };

export class EngineClient {
  private worker: EngineWorker;
  private pending = new Map<string, PendingEntry>();
  private readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;
  private requestCounter = 0;

  constructor(options?: { worker?: EngineWorker; eagerReady?: boolean }) {
    const worker = options?.worker ?? new Worker(new URL('./stockfishWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => this.handleMessage((event as MessageEvent).data as EngineMessage);
    this.worker = worker;
    if (options?.eagerReady) {
      this.readyPromise = Promise.resolve();
    } else {
      this.readyPromise = new Promise((resolve) => {
        this.resolveReady = resolve;
      });
    }
    this.send({ type: 'init' });
  }

  async waitForReady() {
    return this.readyPromise;
  }

  async setElo(elo: number) {
    await this.waitForReady();
    await this.send({ type: 'setElo', elo });
  }

  async getBestMove(fen: string, opts: { movetime?: number; depth?: number } = {}): Promise<BestMoveResult> {
    await this.waitForReady();
    return this.send({ type: 'bestMove', fen, ...opts }) as Promise<BestMoveResult>;
  }

  async evaluate(fen: string, opts: { movetime?: number; depth?: number } = {}): Promise<number | null> {
    await this.waitForReady();
    const res = (await this.send({ type: 'evaluate', fen, ...opts })) as { eval: number | null };
    return res.eval;
  }

  dispose() {
    this.worker.terminate();
    this.pending.forEach((entry) => clearTimeout(entry.timeout));
    this.pending.clear();
  }

  private send(request: { type: 'init' }): Promise<void>;
  private send(request: { type: 'setElo'; elo: number }): Promise<{ elo: number }>;
  private send(request: { type: 'bestMove'; fen: string; movetime?: number; depth?: number }): Promise<BestMoveResult>;
  private send(request: { type: 'evaluate'; fen: string; movetime?: number; depth?: number }): Promise<{ eval: number | null }>;
  private send(request: EngineRequestWithoutId): Promise<unknown> {
    if (request.type === 'init') {
      const bootstrap: EngineRequest = { id: 'init', ...request };
      this.worker.postMessage(bootstrap);
      return Promise.resolve();
    }

    const id = `req-${Date.now()}-${this.requestCounter++}`;
    const payload: EngineRequest = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Engine request timed out: ${request.type}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timeout });
      this.worker.postMessage(payload);
    });
  }

  private resolve(id: string, value: unknown) {
    const entry = this.pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    this.pending.delete(id);
    entry.resolve(value);
  }

  private reject(id: string, reason: unknown) {
    const entry = this.pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    this.pending.delete(id);
    entry.reject(reason);
  }

  // Exposed for tests to simulate worker events without a real Web Worker.
  public ingest(message: EngineMessage) {
    this.handleMessage(message);
  }

  public markReady() {
    if (this.resolveReady) {
      this.resolveReady();
      this.resolveReady = null;
    }
  }

  public getPendingIds() {
    return Array.from(this.pending.keys());
  }

  private handleMessage(message: EngineMessage) {
    if (message.type === 'ready') {
      if (this.resolveReady) {
        this.resolveReady();
        this.resolveReady = null;
      }
      return;
    }

    if (message.type === 'error') {
      this.reject(message.id, new Error(message.message));
      return;
    }

    if (message.type === 'eloSet') {
      this.resolve(message.id, { elo: message.elo });
      return;
    }

    if (message.type === 'bestMove') {
      this.resolve(message.id, { move: message.move, eval: message.eval });
      return;
    }

    if (message.type === 'evaluation') {
      this.resolve(message.id, { eval: message.eval });
    }
  }
}
