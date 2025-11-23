import type { AnalysisFinding } from '../chess/analysis';
import './AnalysisPanel.css';

type Props = {
  findings: AnalysisFinding[] | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
};

export default function AnalysisPanel({ findings, isAnalyzing, onAnalyze }: Props) {
  return (
    <div className="analysis-card">
      <div className="analysis-header">
        <h3>Post-game analysis</h3>
        <button className="pill" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Run analysis'}
        </button>
      </div>
      {!findings && !isAnalyzing && <p className="muted">Finish a game and run analysis to see mistakes.</p>}
      {isAnalyzing && <p className="muted">Stockfish is reviewing your moves...</p>}
      {findings && findings.length === 0 && !isAnalyzing && <p className="muted">No major mistakes detected.</p>}
      {findings && findings.length > 0 && (
        <div className="findings">
          {findings.map((f) => (
            <div key={f.ply} className={`finding ${f.classification}`}>
              <div className="finding-top">
                <span className="badge">{f.classification}</span>
                <span className="muted">
                  Move {f.moveNumber} {f.color === 'w' ? 'White' : 'Black'} played {f.san}
                </span>
              </div>
              <p className="finding-body">
                Best move: <strong>{f.bestMove}</strong> · Lost {Math.abs(f.delta).toFixed(2)} pawns. {f.advice}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
