'use client';
import type { BatsmanStats } from '@/types/cricket';

interface BatsmanCardProps {
  batsman: BatsmanStats;
}

export default function BatsmanCard({ batsman }: BatsmanCardProps) {
  return (
    <div className={`player-card ${batsman.isOnStrike ? 'player-card-on-strike' : ''}`}>
      <div className={`player-indicator ${batsman.isOnStrike ? 'on-strike' : ''}`} aria-hidden="true" />

      <div style={{ minWidth: 0 }}>
        <div className="player-name truncate">
          {batsman.player.name}
          {batsman.isOnStrike && (
            <span style={{ color: 'var(--green)', marginLeft: 6, fontSize: '0.75rem' }}>●</span>
          )}
        </div>
        {batsman.isOut && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
            {batsman.dismissal}
          </div>
        )}
      </div>

      <div className="player-stats-inline" style={{ flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div className="player-stat-val">{batsman.runs}</div>
          <div className="player-stat-sub">runs</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-2)' }}>
            {batsman.balls}
          </div>
          <div className="player-stat-sub">balls</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--amber)' }}>
            {batsman.strikeRate.toFixed(1)}
          </div>
          <div className="player-stat-sub">SR</div>
        </div>
      </div>
    </div>
  );
}
