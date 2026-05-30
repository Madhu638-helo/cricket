'use client';
import React, { useState, useEffect, useRef } from 'react';
import type { Innings, Match, Team, Player, Ball } from '@/types/cricket';
import { formatOvers, buildOverHistory, calcBatsmanStats, calcBowlerStats } from '@/lib/cricket/engine';
import BattingTable from '@/components/scorecard/BattingTable';
import BowlingTable from '@/components/scorecard/BowlingTable';
import OverDots from '@/components/scoring/OverDots';
import ScoreHeader from '@/components/scoring/ScoreHeader';

interface SpectatorViewProps {
  match: Match;
  inningsList: Innings[];
  balls: Ball[];
  players: Player[];
  team1Obj: Team | null;
  team2Obj: Team | null;
  onBack: () => void;
}

function ballLabel(b: Ball): { text: string; color: string; bg: string } {
  if (b.is_wicket) return { text: 'W', color: '#fff', bg: '#ef4444' };
  const total = (b.runs_off_bat ?? 0) + (b.extras ?? 0);
  if (b.extra_type === 'wide') return { text: 'Wd', color: '#f0f0f0', bg: '#374151' };
  if (b.extra_type === 'noball') return { text: 'Nb', color: '#f0f0f0', bg: '#374151' };
  if (b.extra_type === 'bye' || b.extra_type === 'legbye') return { text: `${total}${b.extra_type === 'bye' ? 'B' : 'Lb'}`, color: '#9ca3af', bg: '#1f2937' };
  if (b.runs_off_bat === 6) return { text: '6', color: '#fff', bg: '#7c3aed' };
  if (b.runs_off_bat === 4) return { text: '4', color: '#111', bg: '#fbbf24' };
  if (b.runs_off_bat === 0) return { text: '·', color: '#6b7280', bg: '#1a1a1a' };
  return { text: String(b.runs_off_bat), color: '#f0f0f0', bg: '#1e3a2f' };
}

function ballEvent(b: Ball, batsman: Player | undefined, bowler: Player | undefined): string {
  const bat = batsman?.name?.split(' ')[0] ?? 'Batsman';
  const bowl = bowler?.name?.split(' ')[0] ?? 'Bowler';
  const total = (b.runs_off_bat ?? 0) + (b.extras ?? 0);
  if (b.is_wicket) {
    const wt = b.wicket_type ?? 'out';
    return `${bat} is ${wt}! ${bowl} strikes`;
  }
  if (b.extra_type === 'wide') return `Wide ball — ${total > 1 ? `${total - 1} extra runs` : 'no run'}`;
  if (b.extra_type === 'noball') return `No ball! ${b.runs_off_bat ? `${b.runs_off_bat} off the bat` : 'dot off bat'}`;
  if (b.extra_type === 'bye') return `${total} bye${total > 1 ? 's' : ''}`;
  if (b.extra_type === 'legbye') return `${total} leg bye${total > 1 ? 's' : ''}`;
  if (b.runs_off_bat === 6) return `SIX! ${bat} sends it over the ropes`;
  if (b.runs_off_bat === 4) return `FOUR! ${bat} finds the boundary`;
  if (b.runs_off_bat === 0) return `Dot ball. ${bowl} on target`;
  return `${bat} picks up ${b.runs_off_bat} run${b.runs_off_bat > 1 ? 's' : ''}`;
}

function LastBallHero({ ball, players }: { ball: Ball; players: Player[] }) {
  const batsman = players.find(p => p.id === ball.batsman_id);
  const bowler = players.find(p => p.id === ball.bowler_id);
  const lbl = ballLabel(ball);
  const event = ballEvent(ball, batsman, bowler);

  return (
    <div style={{
      background: lbl.bg === '#ef4444' ? 'rgba(239,68,68,.1)' : lbl.bg === '#7c3aed' ? 'rgba(124,58,237,.1)' : lbl.bg === '#fbbf24' ? 'rgba(251,191,36,.08)' : 'var(--s1)',
      border: `1px solid ${lbl.bg === '#ef4444' ? 'rgba(239,68,68,.3)' : lbl.bg === '#7c3aed' ? 'rgba(124,58,237,.3)' : lbl.bg === '#fbbf24' ? 'rgba(251,191,36,.2)' : 'var(--border)'}`,
      borderRadius: '12px', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '12px', background: lbl.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: lbl.text.length > 1 ? '18px' : '28px', fontWeight: 900,
        fontFamily: 'Barlow Condensed, sans-serif', color: lbl.color, flexShrink: 0,
      }}>{lbl.text}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', marginBottom: '2px' }}>{event}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
          Over {ball.over_number + 1}.{ball.ball_number} · {batsman?.name ?? ''} vs {bowler?.name ?? ''}
        </div>
      </div>
    </div>
  );
}

export default function SpectatorView({
  match, inningsList, balls, players, team1Obj, team2Obj, onBack
}: SpectatorViewProps) {
  const currentInnings = inningsList.find(i => i.status === 'active') ?? inningsList[inningsList.length - 1] ?? null;
  const [activeInningsId, setActiveInningsId] = useState<string>(currentInnings?.id || '');
  const [activeTab, setActiveTab] = useState<'live' | 'scorecard'>('live');
  const feedRef = useRef<HTMLDivElement>(null);

  // Keep activeInningsId in sync when new innings starts
  useEffect(() => {
    if (currentInnings && !activeInningsId) setActiveInningsId(currentInnings.id);
  }, [currentInnings?.id]);

  // Auto-scroll feed to top on new ball
  const prevBallCount = useRef(balls.length);
  useEffect(() => {
    if (balls.length > prevBallCount.current && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevBallCount.current = balls.length;
  }, [balls.length]);

  if (!team1Obj || !team2Obj) return null;

  const displayInnings = inningsList.find(i => i.id === activeInningsId) || currentInnings;
  if (!displayInnings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '36px' }}>🏏</div>
        <div style={{ color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '14px' }}>Waiting for match to start…</div>
      </div>
    );
  }

  const isCurrentInnings = displayInnings.id === currentInnings?.id;
  const isLive = match.status !== 'result';

  const displayBalls = balls.filter(b => b.innings_id === displayInnings.id);
  const sortedBalls = [...displayBalls].sort((a, b) =>
    (b.over_number * 10 + b.ball_number) - (a.over_number * 10 + a.ball_number)
  );

  const overs = formatOvers(displayInnings.total_balls);
  const battingTeamObj = displayInnings.team_id === team1Obj.id ? team1Obj : team2Obj;
  const bowlingTeamObj = battingTeamObj.id === team1Obj.id ? team2Obj : team1Obj;

  const crr = displayInnings.total_balls > 0
    ? Math.round((displayInnings.total_runs / (displayInnings.total_balls / 6)) * 100) / 100
    : 0;
  const target = displayInnings.target ?? null;
  const needed = target ? Math.max(0, target - displayInnings.total_runs) : null;
  const ballsLeft = match.overs * 6 - displayInnings.total_balls;
  const rrr = target && ballsLeft > 0
    ? Math.round(((target - displayInnings.total_runs) / (ballsLeft / 6)) * 100) / 100
    : null;
  const progressPercent = Math.min(100, (displayInnings.total_balls / (match.overs * 6)) * 100);

  const battingPlayers = players.filter(p => p.team_id === displayInnings.team_id || p.is_joker);
  const bowlingPlayers = players.filter(p => p.team_id === bowlingTeamObj.id || p.is_joker);
  const overHistory = buildOverHistory(displayBalls);

  // Striker = last ball's batsman
  const lastBall = displayBalls.length > 0 ? displayBalls[displayBalls.length - 1] : null;
  const strikerId = isCurrentInnings && lastBall ? lastBall.batsman_id : '';

  // Current bowler
  const currentBowlerId = isCurrentInnings && lastBall ? lastBall.bowler_id : '';

  // Current over balls (for the live strip)
  const currentOverNum = Math.floor(displayInnings.total_balls / 6);
  const currentOverBalls = displayBalls
    .filter(b => b.over_number === currentOverNum)
    .map(b => {
      const lbl = ballLabel(b);
      if (b.is_wicket) return 'W';
      if (b.extra_type === 'wide') return 'Wd';
      if (b.extra_type === 'noball') return 'Nb';
      return String((b.runs_off_bat ?? 0) + (b.extras ?? 0));
    });

  const prevInnings = inningsList.find(i => i.status === 'complete') ?? null;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '24px' }}>

      {/* Sticky score header — same as scorer */}
      <ScoreHeader
        innings={displayInnings}
        match={match}
        battingTeam={battingTeamObj}
        bowlingTeam={bowlingTeamObj}
        crr={crr}
        rrr={rrr}
        projectedScore={displayInnings.total_balls > 0 ? Math.round(crr * match.overs) : 0}
        isFreehitNext={lastBall?.extra_type === 'noball'}
        previousInnings={displayInnings.innings_number === 2 ? prevInnings : null}
        activeTab={activeTab === 'scorecard' ? 'scorecard' : 'score'}
        onBackToScore={() => setActiveTab('live')}
        onOpenScorecard={() => setActiveTab('scorecard')}
      />

      {/* Chase bar */}
      {target && needed !== null && isCurrentInnings && isLive && (
        <div style={{ margin: '12px 14px 0', background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.18)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700 }}>Chase</div>
            <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: '#fca5a5', lineHeight: 1, marginTop: '2px' }}>
              {needed} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>runs needed</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700 }}>RRR · Balls</div>
            <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: '#fca5a5', lineHeight: 1, marginTop: '2px' }}>
              {rrr?.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>· {ballsLeft}b</span>
            </div>
          </div>
        </div>
      )}

      {/* Innings toggle */}
      {inningsList.length > 1 && (
        <div style={{ display: 'flex', background: 'var(--s2)', borderRadius: '8px', padding: '3px', margin: '12px 14px 0', border: '1px solid var(--border)' }}>
          {inningsList.map(inn => {
            const t = inn.team_id === team1Obj.id ? team1Obj : team2Obj;
            const active = activeInningsId === inn.id;
            return (
              <button key={inn.id} onClick={() => setActiveInningsId(inn.id)} style={{
                flex: 1, padding: '9px', borderRadius: '6px',
                background: active ? 'var(--s3)' : 'transparent',
                color: active ? 'var(--txt)' : 'var(--muted)',
                border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Barlow, sans-serif', transition: '.15s',
              }}>
                {t.name} <span style={{ color: active ? 'var(--muted)' : 'var(--dim)', fontSize: '11px' }}>{inn.total_runs}/{inn.total_wickets}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab bar: LIVE | SCORECARD */}
      <div style={{ display: 'flex', margin: '12px 14px 0', background: 'var(--s1)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
        {(['live', 'scorecard'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: '8px', borderRadius: '6px',
            background: activeTab === t ? 'var(--s3)' : 'transparent',
            color: activeTab === t ? 'var(--txt)' : 'var(--muted)',
            border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'Barlow, sans-serif', letterSpacing: '.5px', textTransform: 'uppercase',
            transition: '.15s',
          }}>
            {t === 'live' ? '⚡ Live' : '📋 Scorecard'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px 0' }}>

        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Current over dots strip */}
            {isCurrentInnings && isLive && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--live)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>
                    This Over — {currentOverNum + 1}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                    CRR <span style={{ color: 'var(--green)', fontWeight: 700 }}>{crr.toFixed(2)}</span>
                  </span>
                </div>
                {overHistory.length > 0 ? (
                  <OverDots
                    balls={overHistory[overHistory.length - 1].balls}
                    overNumber={currentOverNum + 1}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px dashed var(--border)' }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last ball hero card */}
            {lastBall && isCurrentInnings && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif', marginBottom: '8px' }}>Last Ball</div>
                <LastBallHero ball={lastBall} players={players} />
              </div>
            )}

            {/* On-field players */}
            {isCurrentInnings && (strikerId || currentBowlerId) && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>On Field</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[strikerId, lastBall?.non_striker_id].filter(Boolean).map((pid, i) => {
                    const p = players.find(pl => pl.id === pid);
                    if (!p) return null;
                    const pBalls = displayBalls.filter(b => b.batsman_id === pid);
                    const runs = pBalls.reduce((s, b) => s + (b.runs_off_bat ?? 0), 0);
                    const faced = pBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
                    const fours = pBalls.filter(b => b.runs_off_bat === 4).length;
                    const sixes = pBalls.filter(b => b.runs_off_bat === 6).length;
                    const sr = faced > 0 ? ((runs / faced) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: i === 0 ? 'var(--live)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: i === 0 ? '#fff' : 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {p.name[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                              {p.name} {i === 0 && <span style={{ color: 'var(--live)', fontSize: '10px' }}>*</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                          <span style={{ color: 'var(--green)' }}>{runs}</span>
                          <span style={{ color: 'var(--muted)' }}>({faced})</span>
                          {fours > 0 && <span style={{ color: 'var(--gold)' }}>{fours}×4</span>}
                          {sixes > 0 && <span style={{ color: 'var(--purple)' }}>{sixes}×6</span>}
                          <span style={{ color: 'var(--dim)' }}>{sr}</span>
                        </div>
                      </div>
                    );
                  })}
                  {currentBowlerId && (() => {
                    const p = players.find(pl => pl.id === currentBowlerId);
                    if (!p) return null;
                    const bBalls = displayBalls.filter(b => b.bowler_id === currentBowlerId);
                    const legal = bBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
                    const runs = bBalls.reduce((s, b) => s + (b.runs_off_bat ?? 0) + (b.extras ?? 0), 0);
                    const wkts = bBalls.filter(b => b.is_wicket && b.wicket_type !== 'runout').length;
                    return (
                      <div key={currentBowlerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--blue)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {p.name[0]}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>{p.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                          <span style={{ color: 'var(--blue)' }}>{Math.floor(legal / 6)}.{legal % 6}</span>
                          <span style={{ color: 'var(--muted)' }}>-{runs}-</span>
                          <span style={{ color: wkts > 0 ? '#f87171' : 'var(--muted)' }}>{wkts}w</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Ball-by-ball feed */}
            {sortedBalls.length > 0 && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '3px', height: '14px', background: 'var(--live)', borderRadius: '2px' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Ball by Ball</span>
                </div>
                <div ref={feedRef} style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {sortedBalls.map((b, idx) => {
                    const lbl = ballLabel(b);
                    const batsman = players.find(p => p.id === b.batsman_id);
                    const bowler = players.find(p => p.id === b.bowler_id);
                    const event = ballEvent(b, batsman, bowler);
                    return (
                      <div key={b.id ?? idx} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', borderBottom: '1px solid var(--border)',
                        background: b.is_wicket ? 'rgba(239,68,68,.04)' : b.runs_off_bat === 6 ? 'rgba(124,58,237,.04)' : b.runs_off_bat === 4 ? 'rgba(251,191,36,.03)' : 'transparent',
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', background: lbl.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: lbl.text.length > 1 ? '11px' : '16px', fontWeight: 900,
                          fontFamily: 'Barlow Condensed, sans-serif', color: lbl.color, flexShrink: 0,
                        }}>{lbl.text}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginTop: '1px' }}>
                            {b.over_number + 1}.{b.ball_number} · {batsman?.name ?? ''} · {bowler?.name ?? ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent overs */}
            {overHistory.length > 0 && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Overs</span>
                </div>
                <div style={{ padding: '4px 14px' }}>
                  {[...overHistory].reverse().slice(0, 5).map(ov => (
                    <div key={ov.overNumber} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>Over {ov.overNumber}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: ov.wickets > 0 ? '#f87171' : 'var(--txt)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {ov.runs} runs {ov.wickets > 0 ? `· ${ov.wickets}W` : ''}{ov.isMaiden ? ' · M' : ''}
                        </span>
                      </div>
                      <OverDots balls={ov.balls} overNumber={ov.overNumber} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '3px', height: '14px', background: 'var(--green)', borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Batting</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BattingTable players={battingPlayers} balls={displayBalls} strikerId={strikerId} />
              </div>
            </div>
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '3px', height: '14px', background: 'var(--blue)', borderRadius: '2px' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Bowling</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BowlingTable players={bowlingPlayers} balls={displayBalls} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
