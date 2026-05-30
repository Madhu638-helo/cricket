'use client';
import type { BallSummary } from '@/types/cricket';

interface OverDotsProps {
  balls: BallSummary[];
  overNumber: number; // 1-indexed for display
  maxBalls?: number;
}

function getBallClass(ball: BallSummary): string {
  if (ball.isWicket) return 'ball-dot-wicket';
  if (ball.isSix) return 'ball-dot-6';
  if (ball.isBoundary) return 'ball-dot-4';
  if (ball.isWide) return 'ball-dot-wide';
  if (ball.isNoBall) return 'ball-dot-noball';
  if (ball.runsOffBat === 0 && ball.extras === 0) return 'ball-dot-dot';
  return 'ball-dot-normal';
}

export default function OverDots({ balls, overNumber, maxBalls = 6 }: OverDotsProps) {
  // Fill remaining empty slots
  const legalCount = balls.filter(b => !b.isWide && !b.isNoBall).length;
  const emptySlots = Math.max(0, maxBalls - legalCount);

  return (
    <div className="over-dots" role="list" aria-label={`Over ${overNumber} balls`}>
      <span className="over-label">Ov {overNumber}</span>
      {balls.map((ball, i) => (
        <div
          key={i}
          className={`ball-dot ${getBallClass(ball)} ${ball.isFreehit ? 'ball-dot-freehit' : ''}`}
          role="listitem"
          aria-label={ball.label}
          title={ball.label}
        >
          {ball.label}
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="ball-dot ball-dot-empty"
          aria-hidden="true"
        >
          ·
        </div>
      ))}
    </div>
  );
}
