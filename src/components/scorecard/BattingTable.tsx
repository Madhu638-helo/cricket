'use client';
import type { Player, Ball } from '@/types/cricket';
import { calcBatsmanStats } from '@/lib/cricket/engine';

interface BattingTableProps {
  players: Player[];
  balls: Ball[];
  strikerId: string;
}

export default function BattingTable({ players, balls, strikerId }: BattingTableProps) {
  const stats = players.map(p => ({
    ...calcBatsmanStats(
      p, balls, p.id === strikerId,
      balls.find(b => b.is_wicket && b.batsman_id === p.id)
    ),
  }));

  const batted = stats.filter(s => s.balls > 0 || s.isOut);
  const dnb = stats.filter(s => s.balls === 0 && !s.isOut);

  return (
    <table className="score-table" aria-label="Batting scorecard">
      <thead>
        <tr>
          <th>Batsman</th>
          <th>R</th>
          <th>B</th>
          <th>4s</th>
          <th>6s</th>
          <th>SR</th>
        </tr>
      </thead>
      <tbody>
        {batted.map(s => (
          <tr key={s.player.id} className={s.player.id === strikerId ? 'highlight' : ''}>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: s.isOut ? 'var(--text-2)' : 'var(--text-1)' }}>
                  {s.player.name}
                  {s.isOnStrike && !s.isOut && (
                    <span style={{ color: 'var(--green)', marginLeft: 4 }}>●</span>
                  )}
                </span>
                {s.isOut && s.dismissal && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>{s.dismissal}</span>
                )}
                {!s.isOut && s.balls > 0 && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--green)' }}>batting*</span>
                )}
              </div>
            </td>
            <td className="runs-cell">{s.runs}</td>
            <td>{s.balls}</td>
            <td style={{ color: 'var(--amber)' }}>{s.fours}</td>
            <td style={{ color: 'var(--green)' }}>{s.sixes}</td>
            <td>{s.strikeRate.toFixed(1)}</td>
          </tr>
        ))}
        {dnb.length > 0 && batted.length > 0 && (
          <tr>
            <td colSpan={6} style={{ color: 'var(--text-3)', fontSize: '0.75rem', padding: 'var(--sp-2)' }}>
              DNB: {dnb.map(s => s.player.name).join(', ')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
