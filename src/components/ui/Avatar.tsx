import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
  gradient?: string;
  fontSize?: number;
  online?: boolean;
  onClick?: () => void;
}

const gradients = [
  'linear-gradient(135deg,#E31B23,#8B0000)',
  'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  'linear-gradient(135deg,#22c55e,#15803d)',
  'linear-gradient(135deg,#8b5cf6,#5b21b6)',
  'linear-gradient(135deg,#f59e0b,#b45309)',
];

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

export default function Avatar({ name, size = 40, gradient, fontSize, online = false, onClick }: AvatarProps) {
  const bg = gradient ?? pickGradient(name);
  const fs = fontSize ?? Math.floor(size * 0.36);
  return (
    <div
      className="av"
      style={{ width: size, height: size, background: bg, fontSize: fs, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {initials(name)}
      {online && (
        <div style={{
          position: 'absolute', bottom: '1px', right: '1px',
          width: '10px', height: '10px',
          background: 'var(--green)', borderRadius: '50%', border: '2px solid var(--bg)',
        }} />
      )}
    </div>
  );
}
