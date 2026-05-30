import React from 'react';
import type { BallSummary } from '@/types/cricket';

interface BallDotProps {
  ball: BallSummary;
  size?: number;
}

function getBallClass(ball: BallSummary): string {
  if (ball.isWicket) return 'ball bW';
  if (ball.isWide || ball.isNoBall || ball.extraType === 'bye' || ball.extraType === 'legbye') return 'ball bE';
  if (ball.isSix) return 'ball b6';
  if (ball.isBoundary) return 'ball b4';
  if (ball.runsOffBat === 0) return 'ball b0';
  return `ball b${Math.min(ball.runsOffBat, 3)}`;
}

export default function BallDot({ ball, size = 32 }: BallDotProps) {
  return (
    <div
      className={getBallClass(ball)}
      style={{ width: size, height: size, fontSize: size < 28 ? '10px' : '12px' }}
      title={ball.label}
    >
      {ball.label}
    </div>
  );
}

/** Placeholder ball (empty slot in current over) */
export function BallDotEmpty({ size = 32 }: { size?: number }) {
  return <div className="ball bP" style={{ width: size, height: size }} />;
}
