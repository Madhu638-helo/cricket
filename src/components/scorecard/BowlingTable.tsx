'use client';
import type { Player, Ball } from '@/types/cricket';
import { calcBowlerStats, formatOvers } from '@/lib/cricket/engine';

interface BowlingTableProps {
  players: Player[];
  balls: Ball[];
}

export default function BowlingTable({ players, balls }: BowlingTableProps) {
  const stats = players
    .map(p => calcBowlerStats(p, balls))
    .filter(s => {
      const legalBalls = balls.filter(b => b.bowler_id === s.player.id && b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
      return legalBalls > 0 || s.wides > 0 || s.noBalls > 0;
    })
    .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);

  if (stats.length === 0) return null;

  return (
    <table className="score-table" aria-label="Bowling scorecard">
      <thead>
        <tr>
          <th>Bowler</th>
          <th>O</th>
          <th>M</th>
          <th>R</th>
          <th>W</th>
          <th>Eco</th>
        </tr>
      </thead>
      <tbody>
        {stats.map(s => {
          const legalBalls = balls.filter(b => b.bowler_id === s.player.id && b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
          return (
            <tr key={s.player.id}>
              <td>{s.player.name}</td>
              <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatOvers(legalBalls)}</td>
              <td style={{ color: s.maidens > 0 ? 'var(--green)' : 'inherit', fontWeight: s.maidens > 0 ? 600 : 400 }}>{s.maidens}</td>
              <td>{s.runs}</td>
              <td style={{ color: s.wickets > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: s.wickets > 0 ? 700 : 400 }}>
                {s.wickets}
              </td>
              <td style={{ color: 'var(--muted)' }}>
                {s.economy.toFixed(1)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
