import './Controls.css';

export type TimeControl = { label: string; initial: number; increment: number };

type Props = {
  elo: number;
  onEloChange: (elo: number) => void;
  timeControl: TimeControl;
  presets: TimeControl[];
  onTimeChange: (tc: TimeControl) => void;
  onNewGame: () => void;
  playAs: 'w' | 'b';
  onSideChange: (side: 'w' | 'b') => void;
  showHints: boolean;
  onToggleHints: () => void;
  engineReady: boolean;
  gameOver: string | null;
};

export default function Controls({
  elo,
  onEloChange,
  timeControl,
  presets,
  onTimeChange,
  onNewGame,
  playAs,
  onSideChange,
  showHints,
  onToggleHints,
  engineReady,
  gameOver,
}: Props) {
  return (
    <div className="controls-card">
      <div className="control-row">
        <div>
          <p className="label">AI Strength (ELO)</p>
          <div className="slider-row">
            <input
              type="range"
              min={400}
              max={3000}
              step={50}
              value={elo}
              onChange={(e) => onEloChange(Number(e.target.value))}
            />
            <div className="slider-value">{elo}</div>
          </div>
        </div>
      </div>

      <div className="control-row">
        <p className="label">Time Control</p>
        <div className="time-grid">
          {presets.map((preset) => (
            <button
              key={preset.label}
              className={`pill ${preset.label === timeControl.label ? 'active' : ''}`}
              onClick={() => onTimeChange(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="note">
          Selected: <strong>{timeControl.label}</strong> — {timeControl.initial / 60000} min with {timeControl.increment / 1000}s increment.
        </p>
      </div>

      <div className="control-row">
        <p className="label">Your Color</p>
        <div className="pill-row">
          <button className={`pill ${playAs === 'w' ? 'active' : ''}`} onClick={() => onSideChange('w')}>
            White
          </button>
          <button className={`pill ${playAs === 'b' ? 'active' : ''}`} onClick={() => onSideChange('b')}>
            Black
          </button>
        </div>
      </div>

      <div className="control-row">
        <p className="label">Best Move Hints</p>
        <button className={`pill ${showHints ? 'active' : ''}`} onClick={onToggleHints}>
          {showHints ? 'Hints on' : 'Hints off'}
        </button>
      </div>

      <div className="control-row start-row">
        <button className="start-button" onClick={onNewGame} disabled={!engineReady}>
          {engineReady ? 'Start / Reset Game' : 'Loading engine...'}
        </button>
        {gameOver && <p className="note">{gameOver}</p>}
      </div>
    </div>
  );
}
