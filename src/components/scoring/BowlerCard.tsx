'use client';
import type { BowlerStats } from '@/types/cricket';
import { formatOvers } from '@/lib/cricket/engine';

interface BowlerCardProps {
  bowler: BowlerStats;
}

export default function BowlerCard({ bowler }: BowlerCardProps) {
  return (
    <div className="player-card" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(56,189,248,0.15)' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--blue)', flexShrink: 0,
        boxShadow: '0 0 8px var(--blue-glow)',
      }} aria-hidden="true" />

      <div style={{ minWidth: 0 }}>
        <div className="player-name truncate" style={{ fontSize: '0.875rem' }}>
          {bowler.player.name}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 2 }}>
          bowling
        </div>
      </div>

      <div className="player-stats-inline" style={{ flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>
            {formatOvers(typeof bowler.overs === 'number' ? Math.round((bowler.overs % 1) * 10 + Math.floor(bowler.overs) * 6) : 0)}
          </div>
          <div className="player-stat-sub">ov</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>
            {bowler.runs}
          </div>
          <div className="player-stat-sub">runs</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--red)' }}>
            {bowler.wickets}W
          </div>
          <div className="player-stat-sub">ER {bowler.economy.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
