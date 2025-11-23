import { describe, expect, it } from 'vitest';
import { EngineClient, type EngineWorker } from '../engine/engineClient';

class MockWorker implements EngineWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  messages: unknown[] = [];

  postMessage(data: unknown) {
    this.messages.push(data);
  }

  emit(data: unknown) {
    if (this.onmessage) {
      // @ts-expect-error minimal event shape for tests
      this.onmessage({ data });
    }
  }

  terminate() {
    // no-op for tests
  }
}

describe('EngineClient messaging', () => {
  it('waits for ready and resolves setElo', async () => {
    const worker = new MockWorker();
    const client = new EngineClient({ worker, eagerReady: true });

    // @ts-expect-error access private send for deterministic testing
    const setEloPromise = client.send({ type: 'setElo', elo: 1200 });
    const pendingId = client.getPendingIds()[0];
    expect(pendingId).toBeDefined();
    client.ingest({ id: pendingId, type: 'eloSet', elo: 1200 });

    await expect(setEloPromise).resolves.toEqual({ elo: 1200 });
    client.dispose();
  });

  it('returns best move payload', async () => {
    const worker = new MockWorker();
    const client = new EngineClient({ worker, eagerReady: true });

    // @ts-expect-error access private send for deterministic testing
    const bestPromise = client.send({ type: 'bestMove', fen: 'startpos' });
    const pendingId = client.getPendingIds()[0];
    expect(pendingId).toBeDefined();
    client.ingest({ id: pendingId, type: 'bestMove', move: 'e2e4', eval: 0.12 });

    await expect(bestPromise).resolves.toEqual({ move: 'e2e4', eval: 0.12 });
    client.dispose();
  });
});
