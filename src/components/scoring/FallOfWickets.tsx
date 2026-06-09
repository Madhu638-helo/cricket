'use client';
import React from 'react';
import type { Ball } from '@/types/cricket';

interface FallOfWicketsProps {
  balls: Ball[];
}

function FallOfWickets({ balls }: FallOfWicketsProps) {
  const fows: { runs: number; wickets: number; overString: string }[] = [];
  let currentRuns = 0;
  let currentWickets = 0;
  let legalBalls = 0;

  balls.forEach(b => {
    currentRuns += b.runs_off_bat + (b.extras || 0);
    if (b.extra_type !== 'wide' && b.extra_type !== 'noball') {
      legalBalls++;
    }
    if (b.is_wicket) {
      currentWickets++;
      const ov = Math.floor(legalBalls / 6);
      const bl = legalBalls % 6;
      fows.push({ runs: currentRuns, wickets: currentWickets, overString: `${ov}.${bl}` });
    }
  });

  if (fows.length === 0) return null;

  return (
    <div className="card" style={{ padding: '14px', marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px' }}>
        Fall of Wickets
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {fows.map((fow, i) => (
          <div
            key={i}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: i === fows.length - 1 ? 'rgba(239,68,68,.1)' : 'transparent',
              borderColor: i === fows.length - 1 ? 'rgba(239,68,68,.3)' : 'var(--border)',
              color: i === fows.length - 1 ? '#fca5a5' : 'var(--muted)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {fow.wickets}/{fow.runs} <span style={{ opacity: 0.7, fontWeight: 400 }}>({fow.overString})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(FallOfWickets);
