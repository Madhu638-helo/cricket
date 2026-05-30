import React from 'react';
import Avatar from './Avatar';

interface RankedPlayer {
  rank: number;
  name: string;
  value: string | number;   // e.g. "847 runs" or "38 wkts"
  valueLabel?: string;
  secondary?: string;       // e.g. "SR 142 · Avg 38"
}

interface LeaderboardCardProps {
  players: RankedPlayer[];
  /** Which metric is displayed */
  metric?: string;
}

const podiumColors = ['#f59e0b', '#94a3b8', '#cd7c3c'];
const podiumOrder = [1, 0, 2]; // Gold center, Silver left, Bronze right

export default function LeaderboardCard({ players, metric }: LeaderboardCardProps) {
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  const reordered = podiumOrder.map(i => top3[i]).filter(Boolean);

  return (
    <div>
      {/* Olympic Podium */}
      {top3.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {reordered.map((player, i) => {
            const isGold = player.rank === 1;
            const podiumHeight = [70, 50, 40][i] ?? 40;
            const color = podiumColors[player.rank - 1] ?? '#888';
            return (
              <div key={player.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Avatar name={player.name} size={isGold ? 56 : 44} />
                <div style={{ fontSize: isGold ? '13px' : '11px', fontWeight: 700, textAlign: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.name}
                </div>
                <div style={{ fontSize: isGold ? '16px' : '13px', fontWeight: 800, color }}>{player.value}</div>
                <div style={{
                  width: isGold ? '80px' : '64px',
                  height: `${podiumHeight}px`,
                  background: `linear-gradient(180deg,${color}22,${color}11)`,
                  border: `1px solid ${color}44`,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 900,
                  color,
                }}>
                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranking table */}
      {rest.map(player => (
        <div key={player.rank} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>
            {player.rank}
          </div>
          <Avatar name={player.name} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
            {player.secondary && <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{player.secondary}</div>}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--txt)', flexShrink: 0 }}>{player.value}</div>
        </div>
      ))}
    </div>
  );
}
