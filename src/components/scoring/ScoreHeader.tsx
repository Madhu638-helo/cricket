'use client';
import type { Innings, Match, Team } from '@/types/cricket';
import { formatOvers } from '@/lib/cricket/engine';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface ScoreHeaderProps {
  innings: Innings | null;
  match: Match;
  battingTeam: Team | null;
  bowlingTeam: Team | null;
  crr: number;
  rrr: number | null;
  projectedScore: number;
  isFreehitNext: boolean;
  onOpenScorecard?: () => void;
  previousInnings?: Innings | null;
  activeTab?: string;
  onBackToScore?: () => void;
}

export default function ScoreHeader({
  innings, match, battingTeam, bowlingTeam, crr, rrr, projectedScore, isFreehitNext, onOpenScorecard, previousInnings, activeTab, onBackToScore
}: ScoreHeaderProps) {
  const router = useRouter();

  const overs = innings ? formatOvers(innings.total_balls) : '0.0';
  const target = innings?.target ?? null;
  const needed = target ? target - (innings?.total_runs ?? 0) : null;
  const ballsLeft = match.overs * 6 - (innings?.total_balls ?? 0);
  const progressPercent = innings
    ? Math.min(100, Math.max(0, (innings.total_balls / (match.overs * 6)) * 100))
    : 0;

  const isLive = match.status !== 'result';

  // Match elapsed timer
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!match.created_at || !isLive) return;
    const calc = () => {
      const ms = Date.now() - new Date(match.created_at).getTime();
      const mins = Math.floor(ms / 60000);
      const hrs = Math.floor(mins / 60);
      setElapsed(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [match.created_at, isLive]);

  // Abbreviate team names for the strip
  const abbr = (name: string) => {
    if (!name) return '???';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return name.slice(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
  };

  const battingAbbr = abbr(battingTeam?.name ?? 'BAT');
  const bowlingAbbr = abbr(bowlingTeam?.name ?? 'BWL');

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(24px)',
      background: 'rgba(7,13,20,.96)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
        <button
          onClick={() => router.push('/')}
          aria-label="Back"
          style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Barlow, sans-serif' }}>
            {battingTeam?.name ?? 'Team A'} vs {bowlingTeam?.name ?? 'Team B'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
            {isLive ? (
              <>
                <span className="ldot" />
                <span style={{ fontSize: '10px', color: 'var(--live)', fontWeight: 800, letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>LIVE</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                  · {innings?.innings_number === 2 ? '2nd Inn' : '1st Inn'} · {match.overs} ov{elapsed ? ` · ${elapsed}` : ''}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 800, letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>FINAL</span>
            )}
          </div>
        </div>

        {activeTab === 'scorecard' || activeTab === 'stats' ? (
          <button
            onClick={onBackToScore}
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 11px', fontSize: '11px', fontWeight: 700, color: 'var(--live)', cursor: 'pointer', flexShrink: 0, fontFamily: 'Barlow, sans-serif', letterSpacing: '.3px' }}
          >
            ← SCORE
          </button>
        ) : onOpenScorecard ? (
          <button
            onClick={onOpenScorecard}
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 11px', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', flexShrink: 0, fontFamily: 'Barlow, sans-serif', letterSpacing: '.3px' }}
          >
            CARD
          </button>
        ) : null}
      </div>

      {/* Stadium scoreboard strip */}
      {innings && (
        <div style={{ padding: '4px 14px 12px' }}>
          {isFreehitNext && (
            <div style={{ background: 'rgba(34,197,94,.1)', color: '#86efac', border: '1px solid rgba(34,197,94,.25)', padding: '5px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: 800, marginBottom: '8px', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
              ⚡ FREE HIT NEXT BALL
            </div>
          )}

          {/* Both teams inline like Cricbuzz scoreboard */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Batting team — full score */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--live)', letterSpacing: '.6px', marginBottom: '2px', fontFamily: 'Barlow, sans-serif' }}>
                {battingAbbr} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>batting</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span key={innings.total_runs} style={{ fontSize: '46px', fontWeight: 900, lineHeight: 1, letterSpacing: '-1.5px', fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--txt)', animation: 'score-pop .3s ease-out', display: 'inline-block' }}>
                  {innings.total_runs}
                </span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  /{innings.total_wickets}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginLeft: '2px' }}>
                  ({overs})
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '44px', background: 'var(--border)' }} />

            {/* Bowling team / prev innings */}
            <div style={{ flex: 1 }}>
              {previousInnings ? (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.6px', marginBottom: '2px', fontFamily: 'Barlow, sans-serif' }}>
                    {bowlingAbbr} <span style={{ fontWeight: 600 }}>set {previousInnings.total_runs + 1}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {previousInnings.total_runs}
                    </span>
                    <span style={{ fontSize: '16px', color: 'var(--dim)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                      /{previousInnings.total_wickets}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--dim)', fontFamily: 'Barlow, sans-serif' }}>
                      ({formatOvers(previousInnings.total_balls)})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.6px', marginBottom: '2px', fontFamily: 'Barlow, sans-serif' }}>
                    {bowlingAbbr} <span style={{ fontWeight: 600 }}>bowling</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginTop: '4px' }}>
                    CRR <span style={{ color: 'var(--green)', fontWeight: 800, fontSize: '16px', fontFamily: 'Barlow Condensed, sans-serif' }}>{crr.toFixed(2)}</span>
                  </div>
                  {!target && (
                    <div style={{ fontSize: '11px', color: 'var(--dim)', fontFamily: 'Barlow, sans-serif', marginTop: '1px' }}>
                      Proj <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{projectedScore}</span>
                    </div>
                  )}
                </>
              )}

              {/* Chase info */}
              {target && needed !== null && (
                <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 700, fontFamily: 'Barlow, sans-serif', marginTop: '2px' }}>
                  Need {Math.max(0, needed)} off {ballsLeft}b · RRR {rrr?.toFixed(2) ?? '-'}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: '2px', background: 'var(--s3)', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg,var(--live),#fb923c)', width: `${progressPercent}%`, transition: 'width .6s' }} />
          </div>
        </div>
      )}
    </div>
  );
}
