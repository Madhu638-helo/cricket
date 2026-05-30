import React from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
  highlight?: boolean;
}

export function StatCard({ value, label, color, highlight = false }: StatCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: '12px',
        textAlign: 'center',
        borderColor: highlight ? 'rgba(227,27,35,.2)' : undefined,
      }}
    >
      <div className="heading" style={{ fontSize: '22px', color: color ?? 'var(--txt)' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

interface StatGridProps {
  stats: { value: string | number; label: string; color?: string; highlight?: boolean }[];
  columns?: number;
}

export default function StatGrid({ stats, columns = 4 }: StatGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '8px' }}>
      {stats.map((s, i) => (
        <StatCard key={i} {...s} />
      ))}
    </div>
  );
}
