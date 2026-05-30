import React from 'react';

interface ProgressBarProps {
  value: number;   // 0–100 percentage
  height?: number;
  color?: string;
}

export default function ProgressBar({ value, height = 4, color }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className="prog" style={{ height }}>
      <div
        className="prog-fill"
        style={{
          width: `${clampedValue}%`,
          background: color ?? 'linear-gradient(90deg,var(--red),#ff4d55)',
        }}
      />
    </div>
  );
}
