'use client';
import type { OverSummary } from '@/types/cricket';

interface ManhattanChartProps {
  overHistory: OverSummary[];
  totalOvers: number;
  teamName?: string;
}

export default function ManhattanChart({ overHistory, totalOvers, teamName = 'Team' }: ManhattanChartProps) {
  if (overHistory.length === 0) return null;

  const maxRuns = Math.max(...overHistory.map(o => o.runs), 1);
  const W = 320;
  const H = 100;
  const PAD = { top: 10, right: 12, bottom: 22, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barW = Math.max(4, Math.min(18, innerW / totalOvers - 2));

  return (
    <div className="card" style={{ padding: '14px', marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px', fontFamily: 'Barlow, sans-serif' }}>
        Manhattan — {teamName}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Y-axis labels */}
        {[0, Math.round(maxRuns / 2), maxRuns].map(val => (
          <g key={val}>
            <line
              x1={PAD.left} y1={PAD.top + innerH - (val / maxRuns) * innerH}
              x2={W - PAD.right} y2={PAD.top + innerH - (val / maxRuns) * innerH}
              stroke="rgba(255,255,255,.05)" strokeWidth="1"
            />
            <text
              x={PAD.left - 4} y={PAD.top + innerH - (val / maxRuns) * innerH + 3}
              textAnchor="end" fontSize="7" fill="var(--dim)"
            >{val}</text>
          </g>
        ))}

        {/* Bars */}
        {overHistory.map((ov) => {
          const x = PAD.left + ((ov.overNumber - 0.5) / totalOvers) * innerW - barW / 2;
          const barH = (ov.runs / maxRuns) * innerH;
          const y = PAD.top + innerH - barH;

          // Color: wicket = red, maiden = grey, big over = gold, default = green
          let fill = 'var(--green)';
          if (ov.wickets > 0) fill = '#f87171';
          else if (ov.isMaiden) fill = 'var(--dim)';
          else if (ov.runs >= 15) fill = 'var(--gold)';
          else if (ov.runs >= 10) fill = 'var(--blue)';

          return (
            <g key={ov.overNumber}>
              <rect
                x={x} y={y}
                width={barW} height={Math.max(1, barH)}
                rx="2" fill={fill} opacity={0.85}
              />
              {/* Over number label */}
              <text
                x={PAD.left + ((ov.overNumber - 0.5) / totalOvers) * innerW}
                y={H - 4}
                textAnchor="middle" fontSize="7" fill="var(--dim)"
              >{ov.overNumber}</text>
            </g>
          );
        })}

        {/* Legend */}
        {[
          { label: 'Wkt', color: '#f87171' },
          { label: 'Big', color: 'var(--gold)' },
          { label: 'Runs', color: 'var(--green)' },
        ].map((item, i) => (
          <g key={item.label}>
            <rect x={W - PAD.right - 80 + i * 30} y={2} width="6" height="6" rx="1" fill={item.color} />
            <text x={W - PAD.right - 72 + i * 30} y={8} fontSize="6" fill="var(--muted)">{item.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
