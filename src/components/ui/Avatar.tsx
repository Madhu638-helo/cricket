import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
  gradient?: string;
  fontSize?: number;
  online?: boolean;
  jerseyNumber?: number | string;
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

export default function Avatar({ name, size = 40, gradient, fontSize, online = false, jerseyNumber, onClick }: AvatarProps) {
  const fs = fontSize ?? Math.floor(size * 0.4);
  const showJersey = true; // ALWAYS SHOW JERSEY FOR EVERYONE!

  if (showJersey) {
    return (
      <div
        className="av"
        style={{
          width: size,
          height: size,
          backgroundImage: 'url(/jersey.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#e5e7eb', // fallback
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: onClick ? 'pointer' : undefined,
          borderRadius: '50%', // optional if we want circular, but jerseys might look better in a circle or square. The class 'av' already has 50%.
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {jerseyNumber && (
          <span style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: fs,
            fontFamily: "'Space Grotesk', sans-serif",
            marginTop: size * 0.15, // push down slightly below "INDIA"
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            letterSpacing: '-0.5px'
          }}>
            {jerseyNumber}
          </span>
        )}
        {!jerseyNumber && (
           <span style={{
             color: 'rgba(255,255,255,0.7)',
             fontWeight: 800,
             fontSize: fs * 0.8,
             marginTop: size * 0.15,
           }}>
             {initials(name)}
           </span>
        )}
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

  // Fallback if not showing jersey
  const bg = gradient ?? pickGradient(name);
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
