import { Chess } from 'chess.js';
import { EngineClient } from '../engine/engineClient';

export type Classification = 'ok' | 'inaccuracy' | 'mistake' | 'blunder';

export type AnalysisFinding = {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  bestMove: string;
  delta: number;
  classification: Classification;
  advice: string;
};

export function classifyDelta(delta: number): Classification {
  const abs = Math.abs(delta);
  if (abs < 0.4) return 'ok';
  if (abs < 1.0) return 'inaccuracy';
  if (abs < 2.5) return 'mistake';
  return 'blunder';
}

function buildAdvice(classification: Classification, moveNumber: number): string {
  if (classification === 'inaccuracy') {
    return 'Consider developing pieces and improving king safety before pawn grabs.';
  }
  if (classification === 'mistake') {
    return moveNumber < 10
      ? 'Recheck opening principles: control the center and finish development before tactics.'
      : 'Look for forcing moves and tactics before committing to slow plans.';
  }
  if (classification === 'blunder') {
    return 'Double-check for hanging pieces and direct threats; calculate forcing lines before moving.';
  }
  return 'Solid move.';
}

export async function analyzeGame(
  pgn: string,
  engine: EngineClient,
  config: { movetime: number; maxPlies?: number } = { movetime: 200 }
): Promise<AnalysisFinding[]> {
  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch (err) {
    return [];
  }

  const moves = game.history({ verbose: true });
  const replay = new Chess();
  const findings: AnalysisFinding[] = [];
  const maxPlies = config.maxPlies ?? moves.length;

  for (let idx = 0; idx < Math.min(moves.length, maxPlies); idx += 1) {
    const move = moves[idx];
    const fenBefore = replay.fen();
    const side = replay.turn();

    // Ask engine for best move and its evaluation from current side's perspective.
    const best = await engine.getBestMove(fenBefore, { movetime: config.movetime });
    replay.move(move);

    const evalAfter = await engine.evaluate(replay.fen(), { movetime: config.movetime });
    const bestEval = best.eval ?? 0;
    const actualEval = evalAfter ?? 0;
    const perspectiveEval = side === 'w' ? actualEval : -actualEval;
    const delta = bestEval - perspectiveEval;
    const classification = classifyDelta(delta);

    if (classification !== 'ok') {
      findings.push({
        ply: idx + 1,
        moveNumber: Math.floor(idx / 2) + 1,
        color: side,
        san: move.san,
        bestMove: best.move,
        delta,
        classification,
        advice: buildAdvice(classification, Math.floor(idx / 2) + 1),
      });
    }
  }

  return findings;
}
