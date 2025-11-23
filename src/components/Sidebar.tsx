import { Move } from 'chess.js';
import './Sidebar.css';

type Props = {
  moves: Move[];
};

export default function Sidebar({ moves }: Props) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      moveNumber: i / 2 + 1,
      white: moves[i]?.san,
      black: moves[i + 1]?.san,
    });
  }

  return (
    <div className="sidebar-card">
      <div className="sidebar-header">
        <h3>Moves</h3>
        <p className="muted">{moves.length} plies</p>
      </div>
      <div className="moves-grid">
        <div className="muted">#</div>
        <div className="muted">White</div>
        <div className="muted">Black</div>
        {rows.map((row) => (
          <FragmentRow key={row.moveNumber} moveNumber={row.moveNumber} white={row.white} black={row.black} />
        ))}
      </div>
    </div>
  );
}

type RowProps = {
  moveNumber: number;
  white?: string;
  black?: string;
};

function FragmentRow({ moveNumber, white, black }: RowProps) {
  return (
    <>
      <div className="move-num">{moveNumber}.</div>
      <div className="move">{white ?? ''}</div>
      <div className="move">{black ?? ''}</div>
    </>
  );
}
