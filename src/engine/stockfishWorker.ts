/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
import StockfishFactory from 'stockfish/src/stockfish-17.1-lite-single-03e3232.js';

declare const self: DedicatedWorkerGlobalScope;
export {};

type WorkerRequest =
  | { id: string; type: 'init' }
  | { id: string; type: 'setElo'; elo: number }
  | { id: string; type: 'bestMove'; fen: string; movetime?: number; depth?: number }
  | { id: string; type: 'evaluate'; fen: string; movetime?: number; depth?: number };

type WorkerResponse =
  | { id: string; type: 'ready' }
  | { id: string; type: 'eloSet'; elo: number }
  | { id: string; type: 'bestMove'; move: string; eval: number | null }
  | { id: string; type: 'evaluation'; eval: number | null }
  | { id: string; type: 'error'; message: string };

type PendingJob =
  | { kind: 'bestMove'; id: string; resolve: (payload: { move: string; eval: number | null }) => void; reject: (err: unknown) => void }
  | { kind: 'evaluate'; id: string; resolve: (payload: { eval: number | null }) => void; reject: (err: unknown) => void };

const engine = StockfishFactory();

let readyResolve: (() => void) | null = null;
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

let currentJob: PendingJob | null = null;
let queuedRequests: WorkerRequest[] = [];
let latestScore: number | null = null;

function parseScore(text: string): number | null {
  // Stockfish "info" lines contain either "score cp <centipawns>" or "score mate <moves>"
  if (!text.includes('score')) return null;
  const mateMatch = text.match(/score\s+mate\s+(-?\d+)/);
  if (mateMatch) {
    const mateIn = Number(mateMatch[1]);
    // Represent mate as large eval; positive means side to move is winning.
    return mateIn === 0 ? 0 : mateIn > 0 ? 100 : -100;
  }
  const cpMatch = text.match(/score\s+cp\s+(-?\d+)/);
  if (cpMatch) {
    return Number(cpMatch[1]) / 100;
  }
  return null;
}

function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

function handleEngineMessage(raw: MessageEvent | string) {
  const text = typeof raw === 'string' ? raw : (raw.data as string);

  if (text === 'uciok' && readyResolve) {
    readyResolve();
    readyResolve = null;
    postResponse({ id: 'bootstrap', type: 'ready' });
    return;
  }

  const parsedScore = parseScore(text);
  if (parsedScore !== null) {
    latestScore = parsedScore;
  }

  if (!text.startsWith('bestmove')) return;

  const parts = text.split(/\s+/);
  const move = parts[1];
  const payloadScore = latestScore;
  const job = currentJob;
  currentJob = null;
  latestScore = null;

  if (!job) return;

  if (job.kind === 'bestMove') {
    job.resolve({ move, eval: payloadScore });
  } else if (job.kind === 'evaluate') {
    job.resolve({ eval: payloadScore });
  }

  processQueue();
}

engine.onmessage = (event: MessageEvent | string) => {
  handleEngineMessage(event);
};

function withReady<T>(fn: () => Promise<T>): Promise<T> {
  return readyPromise.then(fn);
}

async function setElo(elo: number, id: string) {
  await withReady(async () => {
    engine.postMessage('setoption name UCI_LimitStrength value true');
    engine.postMessage(`setoption name UCI_Elo value ${Math.max(400, Math.min(3000, Math.round(elo)))}`);
  });
  postResponse({ id, type: 'eloSet', elo });
}

async function runBestMove(req: Extract<WorkerRequest, { type: 'bestMove' }>) {
  await withReady(async () => {
    const { fen, movetime, depth } = req;
    latestScore = null;
    engine.postMessage(`position fen ${fen}`);
    if (movetime) {
      engine.postMessage(`go movetime ${Math.max(50, Math.round(movetime))}`);
    } else if (depth) {
      engine.postMessage(`go depth ${Math.max(6, depth)}`);
    } else {
      engine.postMessage('go movetime 300');
    }
  });

  return new Promise<{ move: string; eval: number | null }>((resolve, reject) => {
    currentJob = { kind: 'bestMove', id: req.id, resolve, reject };
  });
}

async function runEvaluate(req: Extract<WorkerRequest, { type: 'evaluate' }>) {
  await withReady(async () => {
    const { fen, movetime, depth } = req;
    latestScore = null;
    engine.postMessage(`position fen ${fen}`);
    if (movetime) {
      engine.postMessage(`go movetime ${Math.max(50, Math.round(movetime))}`);
    } else if (depth) {
      engine.postMessage(`go depth ${Math.max(6, depth)}`);
    } else {
      engine.postMessage('go movetime 200');
    }
  });

  return new Promise<{ eval: number | null }>((resolve, reject) => {
    currentJob = { kind: 'evaluate', id: req.id, resolve, reject };
  });
}

function processQueue() {
  if (currentJob || queuedRequests.length === 0) return;
  const next = queuedRequests.shift()!;

  if (next.type === 'setElo') {
    setElo(next.elo, next.id).catch((err) => {
      postResponse({ id: next.id, type: 'error', message: (err as Error)?.message ?? 'Failed to set ELO' });
    });
    return processQueue();
  }

  if (next.type === 'bestMove') {
    runBestMove(next)
      .then((result) => {
        postResponse({ id: next.id, type: 'bestMove', ...result });
      })
      .catch((err) => {
        postResponse({ id: next.id, type: 'error', message: (err as Error)?.message ?? 'bestMove failed' });
      });
    return;
  }

  if (next.type === 'evaluate') {
    runEvaluate(next)
      .then((result) => {
        postResponse({ id: next.id, type: 'evaluation', ...result });
      })
      .catch((err) => {
        postResponse({ id: next.id, type: 'error', message: (err as Error)?.message ?? 'evaluation failed' });
      });
    return;
  }
}

function enqueue(request: WorkerRequest) {
  queuedRequests.push(request);
  processQueue();
}

self.onmessage = (event: MessageEvent) => {
  const req = event.data as WorkerRequest;
  if (req.type === 'init') {
    engine.postMessage('uci');
    enqueue({ ...req, type: 'setElo', elo: 1500 });
    return;
  }

  enqueue(req);
};
