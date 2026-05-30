'use client';
import type { OverSummary } from '@/types/cricket';

interface WormGraphProps {
  team1Overs: OverSummary[];
  team2Overs?: OverSummary[];
  totalOvers: number;
  team1Name?: string;
  team2Name?: string;
}

export default function WormGraph({ team1Overs, team2Overs, totalOvers, team1Name = 'Team A', team2Name = 'Team B' }: WormGraphProps) {
  const W = 320;
  const H = 120;
  const PAD = { top: 10, right: 12, bottom: 24, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Build cumulative runs per over
  function buildPoints(overs: OverSummary[]): { x: number; y: number; runs: number }[] {
    const pts: { x: number; y: number; runs: number }[] = [{ x: 0, y: 0, runs: 0 }];
    let cumRuns = 0;
    for (const ov of overs) {
      cumRuns += ov.runs;
      const x = (ov.overNumber / totalOvers) * innerW;
      pts.push({ x, y: cumRuns, runs: cumRuns });
    }
    return pts;
  }

  const t1pts = buildPoints(team1Overs);
  const t2pts = team2Overs ? buildPoints(team2Overs) : [];

  const allRunValues = [...t1pts, ...t2pts].map(p => p.y);
  const maxRuns = Math.max(...allRunValues, 1);

  function toSvgY(runs: number) {
    return innerH - (runs / maxRuns) * innerH;
  }

  function pointsToPath(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x + PAD.left} ${toSvgY(p.y) + PAD.top}`).join(' ');
  }

  function pointsToArea(pts: { x: number; y: number }[]) {
    if (pts.length < 2) return '';
    const path = pointsToPath(pts);
    const lastX = pts[pts.length - 1].x + PAD.left;
    return `${path} L ${lastX} ${innerH + PAD.top} L ${PAD.left} ${innerH + PAD.top} Z`;
  }

  // Y-axis labels
  const yLabels = [0, Math.round(maxRuns / 2), maxRuns];
  // X-axis labels (overs)
  const xLabels = [0, Math.round(totalOvers / 2), totalOvers];

  return (
    <div className="worm-container" aria-label="Run progression worm chart">
      <svg
        className="worm-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Worm graph: ${team1Name} vs${team2Overs ? ` ${team2Name}` : ''}`}
      >
        <defs>
          <linearGradient id="t1grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="t2grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map(val => (
          <g key={val}>
            <line
              x1={PAD.left} y1={toSvgY(val) + PAD.top}
              x2={W - PAD.right} y2={toSvgY(val) + PAD.top}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
            <text
              x={PAD.left - 4} y={toSvgY(val) + PAD.top + 4}
              textAnchor="end" fontSize="8" fill="var(--text-3)"
            >{val}</text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map(ov => (
          <text
            key={ov}
            x={(ov / totalOvers) * innerW + PAD.left}
            y={H - 4}
            textAnchor="middle" fontSize="8" fill="var(--text-3)"
          >{ov}</text>
        ))}

        {/* Team 2 area + line */}
        {t2pts.length > 1 && (
          <>
            <path d={pointsToArea(t2pts)} fill="url(#t2grad)" />
            <path d={pointsToPath(t2pts)} fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Team 1 area + line */}
        {t1pts.length > 1 && (
          <>
            <path d={pointsToArea(t1pts)} fill="url(#t1grad)" />
            <path
              d={pointsToPath(t1pts)}
              fill="none"
              stroke="var(--green)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Latest point glow dot */}
            {t1pts.length > 1 && (() => {
              const last = t1pts[t1pts.length - 1];
              return (
                <circle
                  cx={last.x + PAD.left}
                  cy={toSvgY(last.y) + PAD.top}
                  r="4"
                  fill="var(--green)"
                  style={{ filter: 'drop-shadow(0 0 4px var(--green))' }}
                />
              );
            })()}
          </>
        )}

        {/* Legend */}
        <rect x={PAD.left} y={PAD.top} width="10" height="2" fill="var(--green)" rx="1" />
        <text x={PAD.left + 14} y={PAD.top + 5} fontSize="8" fill="var(--text-2)">{team1Name}</text>
        {t2pts.length > 1 && (
          <>
            <rect x={PAD.left + 80} y={PAD.top} width="10" height="2" fill="var(--blue)" rx="1" />
            <text x={PAD.left + 94} y={PAD.top + 5} fontSize="8" fill="var(--text-2)">{team2Name}</text>
          </>
        )}
      </svg>
    </div>
  );
}
