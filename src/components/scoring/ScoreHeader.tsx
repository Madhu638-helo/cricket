'use client';
import type { Innings, Match, Team } from '@/types/cricket';
import { formatOvers } from '@/lib/cricket/engine';

interface ScoreHeaderProps {
  innings: Innings | null;
  match: Match;
  battingTeam: Team | null;
  bowlingTeam: Team | null;
  crr: number;
  rrr: number | null;
  projectedScore: number;
  isFreehitNext: boolean;
}

export default function ScoreHeader({
  innings, match, battingTeam, bowlingTeam, crr, rrr, projectedScore, isFreehitNext
}: ScoreHeaderProps) {
  if (!innings) return null;

  const overs = formatOvers(innings.total_balls);
  const target = innings.target;
  const needed = target ? target - innings.total_runs : null;
  const ballsLeft = match.overs * 6 - innings.total_balls;

  return (
    <header className="score-header">
      {/* Free Hit Banner */}
      {isFreehitNext && (
        <div style={{
          background: 'linear-gradient(135deg, var(--green-bg), rgba(0,255,136,0.2))',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--r-sm)',
          padding: '6px var(--sp-3)',
          marginBottom: 'var(--sp-2)',
          textAlign: 'center',
          color: 'var(--green)',
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          animation: 'pulse-dot 1s ease-in-out infinite',
        }}>
          ⚡ FREE HIT
        </div>
      )}

      {/* Team name */}
      <div style={{ marginBottom: 'var(--sp-1)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
          {battingTeam?.name ?? 'Batting'} {innings.innings_number === 2 ? '(2nd)' : ''}
        </span>
      </div>

      {/* Main score */}
      <div className="score-header-main">
        <span className="score-runs-display">
          {innings.total_runs}
          <span className="score-wickets-display">/{innings.total_wickets}</span>
        </span>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="score-overs-display">{overs} Ov</div>
          {target && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              T: {target}
            </div>
          )}
        </div>
      </div>

      {/* Rate strip */}
      <div className="score-rates">
        <div className="rate-item">
          <span className="rate-value">{crr.toFixed(2)}</span>
          <span className="rate-label">CRR</span>
        </div>
        {rrr !== null && (
          <div className="rate-item">
            <span className="rate-value" style={{ color: rrr > 12 ? 'var(--red)' : rrr > 9 ? 'var(--amber)' : 'var(--green)' }}>
              {isFinite(rrr) ? rrr.toFixed(2) : '∞'}
            </span>
            <span className="rate-label">RRR</span>
          </div>
        )}
        <div className="rate-item">
          <span className="rate-value" style={{ color: 'var(--blue)' }}>{projectedScore}</span>
          <span className="rate-label">Proj</span>
        </div>
        {target && needed !== null && (
          <div className="rate-item">
            <span className="rate-value" style={{ color: 'var(--amber)' }}>
              {needed > 0 ? `${needed} off ${ballsLeft}b` : '🎉'}
            </span>
            <span className="rate-label">Need</span>
          </div>
        )}
      </div>

      {/* Extras */}
      {innings.total_extras > 0 && (
        <div style={{ marginTop: 'var(--sp-1)', fontSize: '0.6875rem', color: 'var(--text-3)' }}>
          Extras: {innings.total_extras}
        </div>
      )}
    </header>
  );
}
