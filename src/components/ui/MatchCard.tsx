import React from 'react';
import Avatar from './Avatar';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

interface MatchCardProps {
  matchName: string;
  ground?: string;
  format?: string;
  code: string;
  status: 'live' | 'upcoming' | 'done';
  // Live
  battingTeam?: string;
  runs?: number;
  wickets?: number;
  overs?: string;
  crr?: number;
  target?: number;
  needRuns?: number;
  needOvers?: string;
  // Upcoming
  date?: string;
  time?: string;
  playerCount?: number;
  playerInitials?: string[];
  onClick?: () => void;
  progressPct?: number;
}

export default function MatchCard({
  matchName, ground, format, code, status,
  battingTeam, runs, wickets, overs, crr, target, needRuns, needOvers,
  date, time, playerCount, playerInitials = [],
  onClick, progressPct,
}: MatchCardProps) {

  if (status === 'live') {
    return (
      <div
        className="card card-press"
        style={{ padding: '16px', borderColor: 'rgba(227,27,35,.2)', background: 'linear-gradient(135deg,rgba(227,27,35,.06),var(--s1))' }}
        onClick={onClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="ldot" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)' }}>LIVE</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{matchName}</span>
          </div>
          {format && <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--s3)', padding: '2px 8px', borderRadius: '8px' }}>{format}</span>}
        </div>
        {battingTeam !== undefined && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '1px' }}>{battingTeam}</div>
              <div className="heading" style={{ fontSize: '30px' }}>
                {runs ?? 0}<span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--muted)' }}>/{wickets ?? 0}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{overs} ov · CRR {crr?.toFixed(2)}</div>
            </div>
          </div>
        )}
        {progressPct !== undefined && <ProgressBar value={progressPct} />}
        {needRuns !== undefined && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center', background: 'var(--s2)', padding: '6px', borderRadius: '8px' }}>
            Need <b style={{ color: 'var(--live)' }}>{needRuns} runs in {needOvers} ov</b> · Tap to watch
          </div>
        )}
      </div>
    );
  }

  if (status === 'upcoming') {
    return (
      <div className="card card-press" style={{ padding: '16px' }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Badge variant="upcoming">Upcoming</Badge>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{date} · {time}</span>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{matchName}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '10px' }}>
          {ground && <span>{ground}</span>}
          {format && <span>{format}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex' }}>
              {playerInitials.slice(0, 3).map((initial, i) => (
                <div key={i} className="av" style={{ width: '24px', height: '24px', fontSize: '9px', background: 'linear-gradient(135deg,#E31B23,#8B0000)', border: '2px solid var(--s1)', marginLeft: i > 0 ? '-6px' : 0, zIndex: 3 - i }}>
                  {initial}
                </div>
              ))}
            </div>
            {playerCount !== undefined && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{playerCount} joined</span>}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', background: 'var(--s3)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {code}
          </span>
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="card card-press" style={{ padding: '16px' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <Badge variant="done">Completed</Badge>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{code}</span>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700 }}>{matchName}</div>
    </div>
  );
}
