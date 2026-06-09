'use client';
import React from 'react';
import type { BallSummary } from '@/types/cricket';

interface OverDotsProps {
  balls: BallSummary[];
  overNumber: number;
  maxBalls?: number;
}

function getDotClass(b: BallSummary): string {
  if (b.isWicket) return 'bW';
  if (b.isSix) return 'b6';
  if (b.isBoundary) return 'b4';
  if (b.isWide || b.isNoBall) return 'bE';
  if (b.runsOffBat === 0 && b.extras === 0) return 'b0';
  return 'b1';
}

function getLabel(b: BallSummary): string {
  if (b.isWicket) return 'W';
  if (b.isWide) return 'wd';
  if (b.isNoBall) return 'nb';
  if (b.isSix) return '6';
  if (b.isBoundary) return '4';
  if (b.runsOffBat === 0 && b.extras === 0) return '·';
  return String(b.runsOffBat + b.extras);
}

function OverDots({ balls, overNumber, maxBalls = 6 }: OverDotsProps) {
  const legalCount = balls.filter(b => !b.isWide && !b.isNoBall).length;
  const emptySlots = Math.max(0, maxBalls - legalCount);
  const overRuns = balls.reduce((s, b) => s + b.runsOffBat + b.extras, 0);
  const overWkts = balls.filter(b => b.isWicket).length;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }} role="list" aria-label={`Over ${overNumber}`}>
      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.5px', minWidth: '28px' }}>
        Ov {overNumber}
      </span>
      {balls.map((b, i) => (
        <div
          key={i}
          className={`ball ${getDotClass(b)}${b.isFreehit ? ' freehit' : ''}`}
          role="listitem"
          title={b.label}
          style={{ width: '28px', height: '28px', fontSize: '10px', position: 'relative' }}
        >
          {getLabel(b)}
          {b.isFreehit && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--live)', border: '1px solid var(--bg)' }} />
          )}
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`e${i}`} className="ball bP" role="listitem" aria-hidden style={{ width: '28px', height: '28px' }} />
      ))}
      {balls.length > 0 && (
        <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 700, color: overWkts > 0 ? '#f87171' : 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
          {overRuns}{overWkts > 0 ? `/${overWkts}W` : ''}
        </span>
      )}
    </div>
  );
}

export default React.memo(OverDots);
