import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Move, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { EngineClient } from './engine/engineClient';
import type { BestMoveResult } from './engine/engineClient';
import { ChessClock } from './chess/clock';
import type { ClockState } from './chess/clock';
import { analyzeGame } from './chess/analysis';
import type { AnalysisFinding } from './chess/analysis';
import Controls, { type TimeControl } from './components/Controls';
import Sidebar from './components/Sidebar';
import AnalysisPanel from './components/AnalysisPanel';
import './App.css';

const TIME_PRESETS: TimeControl[] = [
  { label: '3 + 2', initial: 3 * 60 * 1000, increment: 2000 },
  { label: '5 + 5', initial: 5 * 60 * 1000, increment: 5000 },
  { label: '10 + 0', initial: 10 * 60 * 1000, increment: 0 },
  { label: '30 + 0', initial: 30 * 60 * 1000, increment: 0 },
];

function formatMs(ms: number) {
  const clamped = Math.max(0, Math.round(ms));
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const tenths = Math.floor((clamped % 1000) / 100);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${tenths}`;
}

function App() {
  const [elo, setElo] = useState(1500);
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_PRESETS[1]);
  const [playAs, setPlayAs] = useState<'w' | 'b'>('w');
  const [showHints, setShowHints] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const [status, setStatus] = useState<string>('Select settings and start a game');
  const [hint, setHint] = useState<BestMoveResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisFinding[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEngineTurn, setIsEngineTurn] = useState(false);

  const engineRef = useRef<EngineClient | null>(null);
  const gameRef = useRef(new Chess());
  const clockRef = useRef(new ChessClock(timeControl.initial, timeControl.increment));

  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [clockState, setClockState] = useState<ClockState>(clockRef.current.getState());
  const [gameOver, setGameOver] = useState<string | null>(null);

  useEffect(() => {
    const engine = new EngineClient();
    engineRef.current = engine;
    engine.waitForReady().then(() => {
      setEngineReady(true);
      engine.setElo(elo).catch(() => {});
    });
    return () => {
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!engineReady) return;
    engineRef.current?.setElo(elo).catch(() => {});
  }, [elo, engineReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = clockRef.current.getState();
      setClockState(state);
      if (!gameOver && state.flagged) {
        setGameOver(state.flagged === 'w' ? 'White flagged' : 'Black flagged');
        setStatus('Time expired');
        clockRef.current.pause();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gameOver]);

  const playerOrientation = useMemo(() => (playAs === 'w' ? 'white' : 'black'), [playAs]);

  const resetGameState = () => {
    gameRef.current = new Chess();
    setAnalysis(null);
    setHint(null);
    setGameOver(null);
    setHistory([]);
    setFen(gameRef.current.fen());
    clockRef.current.reset(timeControl.initial, timeControl.increment);
    clockRef.current.start(playAs);
    setClockState(clockRef.current.getState());
    setStatus('Game started');
  };

  const computeMoveTime = () => {
    const base = Math.max(150, timeControl.initial / 40);
    return Math.min(3500, base);
  };

  const updateGameState = () => {
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history({ verbose: true }));
  };

  const describeGameOver = () => {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      return `${g.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
    }
    if (g.isDraw()) return 'Draw';
    if (g.isStalemate()) return 'Stalemate';
    if (g.isThreefoldRepetition()) return 'Draw by repetition';
    return 'Game over';
  };

  const runAnalysis = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsAnalyzing(true);
    try {
      const findings = await analyzeGame(gameRef.current.pgn(), engine, { movetime: 250, maxPlies: 80 });
      setAnalysis(findings);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGameEnd = () => {
    const message = describeGameOver();
    setGameOver(message);
    setStatus(message);
    clockRef.current.pause();
    runAnalysis();
  };

  const applyUciMove = (uci: string) => {
    const move = {
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci.length === 5 ? (uci[4] as string) : 'q',
    };
    gameRef.current.move(move);
    updateGameState();
  };

  const triggerEngineMove = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsEngineTurn(true);
    const result = await engine.getBestMove(gameRef.current.fen(), { movetime: computeMoveTime() });
    applyUciMove(result.move);
    clockRef.current.switchTurn(playAs);
    setIsEngineTurn(false);
    if (gameRef.current.isGameOver()) {
      handleGameEnd();
    }
  };

  const startGame = async () => {
    resetGameState();
    await engineRef.current?.setElo(elo);
    if (playAs === 'b') {
      clockRef.current.switchTurn('w');
      await triggerEngineMove();
    }
  };

  const onDrop = (source: Square, target: Square) => {
    if (gameRef.current.isGameOver() || clockState.flagged) return false;
    if (gameRef.current.turn() !== playAs) return false;

    const move = gameRef.current.move({ from: source, to: target, promotion: 'q' });
    if (!move) return false;

    updateGameState();
    setHint(null);
    clockRef.current.switchTurn(playAs === 'w' ? 'b' : 'w');

    if (gameRef.current.isGameOver()) {
      handleGameEnd();
      return true;
    }

    triggerEngineMove().catch(() => {});
    return true;
  };

  useEffect(() => {
    if (!showHints || !engineReady) return;
    if (gameRef.current.turn() !== playAs) return;
    if (gameRef.current.isGameOver()) return;
    let cancelled = false;
    engineRef.current
      ?.getBestMove(gameRef.current.fen(), { movetime: 200 })
      .then((res) => {
        if (!cancelled) setHint(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fen, showHints, engineReady, playAs]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Chess Coach</p>
          <h1>Train against an adjustable AI</h1>
          <p className="subhead">Set ELO up to 3000, pick a time control, play, peek at best moves, and study mistakes.</p>
        </div>
        <div className="status-pill">{status}</div>
      </header>

      <main className="layout">
        <section className="board-column">
          <div className="board-card">
            <div className="clock-row">
              <div className={`clock ${clockState.active === 'b' ? 'active' : ''}`}>
                <span className="label">Black</span>
                <span className="time">{formatMs(clockState.blackMs)}</span>
              </div>
              <div className={`clock ${clockState.active === 'w' ? 'active' : ''}`}>
                <span className="label">White</span>
                <span className="time">{formatMs(clockState.whiteMs)}</span>
              </div>
            </div>
            <Chessboard
              options={{
                id: 'coach-board',
                position: fen,
                boardOrientation: playerOrientation as 'white' | 'black',
                allowDragging: !isEngineTurn && !gameOver,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  onDrop(sourceSquare as Square, targetSquare as Square),
                animationDurationInMs: 150,
                boardStyle: { width: '100%', maxWidth: '100%' },
                darkSquareStyle: { backgroundColor: '#2f3b59' },
                lightSquareStyle: { backgroundColor: '#e3e7f3' },
              }}
            />
            <div className="hint-bar">
              <div>
                {hint && showHints ? (
                  <>
                    <span className="muted">Best move suggestion: </span>
                    <strong>{hint.move}</strong>
                    {hint.eval !== null && <span className="muted"> · Eval {hint.eval.toFixed(2)}</span>}
                  </>
                ) : (
                  <span className="muted">Hints off</span>
                )}
              </div>
              {isEngineTurn && <div className="engine-thinking">Engine thinking...</div>}
            </div>
          </div>
        </section>

        <aside className="sidebar">
          <Controls
            elo={elo}
            onEloChange={setElo}
            timeControl={timeControl}
            presets={TIME_PRESETS}
            onTimeChange={setTimeControl}
            onNewGame={startGame}
            playAs={playAs}
            onSideChange={setPlayAs}
            showHints={showHints}
            onToggleHints={() => setShowHints((v) => !v)}
            engineReady={engineReady}
            gameOver={gameOver}
          />
          <Sidebar moves={history} />
          <AnalysisPanel findings={analysis} isAnalyzing={isAnalyzing} onAnalyze={runAnalysis} />
        </aside>
      </main>
    </div>
  );
}

export default App;
