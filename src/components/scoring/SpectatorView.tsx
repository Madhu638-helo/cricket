'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Innings, Match, Team, Player, Ball } from '@/types/cricket';
import { formatOvers, buildOverHistory, calcBatsmanStats, calcBowlerStats } from '@/lib/cricket/engine';
import BattingTable from '@/components/scorecard/BattingTable';
import BowlingTable from '@/components/scorecard/BowlingTable';
import OverDots from '@/components/scoring/OverDots';
import ScoreHeader from '@/components/scoring/ScoreHeader';
import FallOfWickets from '@/components/scoring/FallOfWickets';
import ManhattanChart from '@/components/scoring/ManhattanChart';
import WormGraph from '@/components/scoring/WormGraph';
import ManageTeamsSheet from '@/components/sheets/ManageTeamsSheet';
import InningsBreakSheet from '@/components/sheets/InningsBreakSheet';
import { useRouter } from 'next/navigation';

interface SpectatorViewProps {
  match: Match;
  inningsList: Innings[];
  balls: Ball[];
  players: Player[];
  team1Obj: Team | null;
  team2Obj: Team | null;
  isOwner?: boolean;
  code?: string;
  onBack: () => void;
}

function ballLabel(b: Ball): { text: string; color: string; bg: string } {
  if (b.is_wicket) return { text: 'W', color: '#fff', bg: '#ef4444' };
  const total = (b.runs_off_bat ?? 0) + (b.extras ?? 0);
  if (b.extra_type === 'wide') return { text: 'Wd', color: '#f0f0f0', bg: '#374151' };
  if (b.extra_type === 'noball') return { text: 'Nb', color: '#f0f0f0', bg: '#374151' };
  if (b.extra_type === 'bye' || b.extra_type === 'legbye') return { text: `${total}${b.extra_type === 'bye' ? 'B' : 'Lb'}`, color: 'var(--muted)', bg: 'var(--s2)' };
  if (b.runs_off_bat === 6) return { text: '6', color: '#fff', bg: '#7c3aed' };
  if (b.runs_off_bat === 4) return { text: '4', color: '#111', bg: '#fbbf24' };
  if (b.runs_off_bat === 0) return { text: '·', color: 'var(--muted)', bg: '#1a1a1a' };
  return { text: String(b.runs_off_bat), color: '#f0f0f0', bg: '#1e3a2f' };
}

// Rich commentary templates with variety
const SIX_TEMPLATES = [
  (bat: string) => `🚀 SIX! ${bat} launches it over the boundary!`,
  (bat: string) => `💥 MAXIMUM! ${bat} sends it into orbit!`,
  (bat: string) => `🔥 SIX! ${bat} goes big — that's out of the park!`,
  (bat: string) => `⚡ HUGE SIX! ${bat} muscles it over the ropes!`,
  (bat: string) => `🎆 What a hit! ${bat} clears the fence with ease!`,
];
const FOUR_TEMPLATES = [
  (bat: string) => `🏏 FOUR! ${bat} finds the boundary beautifully!`,
  (bat: string) => `💫 Boundary! ${bat} times it to perfection!`,
  (bat: string) => `🎯 FOUR! Superb placement by ${bat}!`,
  (bat: string) => `⚡ Racing away! ${bat} pierces the field for four!`,
];
const WICKET_TEMPLATES = [
  (bat: string, bowl: string, wt: string) => `🔴 OUT! ${bat} is ${wt}! ${bowl} strikes!`,
  (bat: string, bowl: string, wt: string) => `💀 WICKET! ${bat} departs — ${wt}. ${bowl} celebrates!`,
  (bat: string, bowl: string, wt: string) => `🎯 Gone! ${bat} walks back — ${wt} by ${bowl}!`,
];
const DOT_TEMPLATES = [
  (bat: string, bowl: string) => `Dot ball. ${bowl} keeps it tight.`,
  (bat: string, bowl: string) => `No run. Good delivery by ${bowl}.`,
  (bat: string, bowl: string) => `Dot! ${bowl} on target, ${bat} defends.`,
];

function ballEvent(b: Ball, batsman: Player | undefined, bowler: Player | undefined): string {
  const bat = batsman?.name?.split(' ')[0] ?? 'Batsman';
  const bowl = bowler?.name?.split(' ')[0] ?? 'Bowler';
  const total = (b.runs_off_bat ?? 0) + (b.extras ?? 0);
  // Use ball_number as seed for variety
  const seed = (b.ball_number ?? 0) + (b.over_number ?? 0);
  if (b.is_wicket) {
    const wt = b.wicket_type ?? 'out';
    return WICKET_TEMPLATES[seed % WICKET_TEMPLATES.length](bat, bowl, wt);
  }
  if (b.extra_type === 'wide') return `Wide ball${total > 1 ? ` — ${total} runs added` : ''}. Pressure on ${bowl}.`;
  if (b.extra_type === 'noball') return `No ball! ${b.runs_off_bat ? `${bat} smacks ${b.runs_off_bat} off it` : `${bat} blocks it`}. Free hit next!`;
  if (b.extra_type === 'bye') return `${total} bye${total > 1 ? 's' : ''} — keeper misses, runs taken.`;
  if (b.extra_type === 'legbye') return `${total} leg bye${total > 1 ? 's' : ''} — off the pads.`;
  if (b.runs_off_bat === 6) return SIX_TEMPLATES[seed % SIX_TEMPLATES.length](bat);
  if (b.runs_off_bat === 4) return FOUR_TEMPLATES[seed % FOUR_TEMPLATES.length](bat);
  if (b.runs_off_bat === 0) return DOT_TEMPLATES[seed % DOT_TEMPLATES.length](bat, bowl);
  if (b.runs_off_bat === 1) return `${bat} nudges it for a quick single.`;
  if (b.runs_off_bat === 2) return `${bat} picks up a comfortable two runs.`;
  if (b.runs_off_bat === 3) return `${bat} runs hard for three! Great running.`;
  return `${bat} picks up ${b.runs_off_bat} run${b.runs_off_bat > 1 ? 's' : ''}.`;
}

const LastBallHero = React.memo(({ ball, players }: { ball: Ball; players: Player[] }) => {
  const batsman = players.find(p => p.id === ball.batsman_id);
  const bowler = players.find(p => p.id === ball.bowler_id);
  const lbl = ballLabel(ball);
  const event = ballEvent(ball, batsman, bowler);

  return (
    <div style={{
      background: lbl.bg === '#ef4444' ? 'rgba(239,68,68,.1)' : lbl.bg === '#7c3aed' ? 'rgba(124,58,237,.1)' : lbl.bg === '#fbbf24' ? 'rgba(251,191,36,.08)' : 'var(--s1)',
      border: `1px solid ${lbl.bg === '#ef4444' ? 'rgba(239,68,68,.3)' : lbl.bg === '#7c3aed' ? 'rgba(124,58,237,.3)' : lbl.bg === '#fbbf24' ? 'rgba(251,191,36,.2)' : 'var(--border)'}`,
      borderRadius: '14px', padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px', background: lbl.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: lbl.text.length > 1 ? '18px' : '28px', fontWeight: 900,
        fontFamily: 'Barlow Condensed, sans-serif', color: lbl.color, flexShrink: 0,
        boxShadow: lbl.bg === '#ef4444' ? '0 0 20px rgba(239,68,68,.3)' : lbl.bg === '#7c3aed' ? '0 0 20px rgba(124,58,237,.3)' : lbl.bg === '#fbbf24' ? '0 0 20px rgba(251,191,36,.2)' : 'none',
      }}>{lbl.text}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', marginBottom: '2px', lineHeight: 1.3 }}>{event}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
          Over {ball.over_number + 1}.{ball.ball_number} · {batsman?.name ?? ''} vs {bowler?.name ?? ''}
        </div>
      </div>
    </div>
  );
});

const SpectatorView = React.memo(({
  match, inningsList, balls, players, team1Obj, team2Obj, isOwner, code, onBack
}: SpectatorViewProps) => {
  const router = useRouter();
  const currentInnings = inningsList.find(i => i.status === 'active') ?? inningsList[inningsList.length - 1] ?? null;
  const [activeInningsId, setActiveInningsId] = useState<string>(currentInnings?.id || '');
  const [activeTab, setActiveTab] = useState<'live' | 'stats' | 'scorecard'>('live');
  const [playAgainOvers, setPlayAgainOvers] = useState<number>(0); // 0 = inherit from match
  const [showManageTeams, setShowManageTeams] = useState(false);
  const [showInningsBreak, setShowInningsBreak] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Keep activeInningsId in sync when new innings starts
  useEffect(() => {
    if (currentInnings && currentInnings.id !== activeInningsId) {
      setActiveInningsId(currentInnings.id);
    }
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
    const prevCompleted = inningsList.find(i => i.status === 'complete') ?? null;
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
        {match.status === 'innings_break' && prevCompleted ? (
          <>
            <div style={{ fontSize: '36px' }}>☕</div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Barlow, sans-serif', color: 'var(--txt)' }}>Innings Break</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
              Target: {prevCompleted.total_runs + 1} runs
            </div>
            {isOwner && code && (
              <button
                onClick={() => setShowInningsBreak(true)}
                style={{ background: 'var(--live)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow, sans-serif', marginTop: '8px' }}
              >
                Start 2nd Innings →
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: '36px' }}>🏏</div>
            <div style={{ color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '14px' }}>Waiting for match to start…</div>
          </>
        )}
        {/* InningsBreakSheet for owner in SpectatorView */}
        {isOwner && code && showInningsBreak && prevCompleted && team1Obj && team2Obj && (
          <InningsBreakSheet
            open={showInningsBreak}
            target={prevCompleted.total_runs + 1}
            team1Runs={prevCompleted.total_runs}
            team1Name={prevCompleted.team_id === team1Obj.id ? team1Obj.name : team2Obj.name}
            team2Name={prevCompleted.team_id === team1Obj.id ? team2Obj.name : team1Obj.name}
            overs={match.overs}
            battingPlayers={players.filter(p => p.team_id !== prevCompleted.team_id || p.is_joker).map(p => ({ id: p.id, name: p.name }))}
            bowlingPlayers={players.filter(p => p.team_id === prevCompleted.team_id || p.is_joker).map(p => ({ id: p.id, name: p.name }))}
            onStartInnings2={async (opener1, opener2, bowler) => {
              const inn2TeamId = prevCompleted.team_id === match.team1_id ? match.team2_id : match.team1_id;
              await fetch(`/api/match/${code}/action`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'start_innings_2',
                  data: {
                    matchId: match.id,
                    battingTeamId: inn2TeamId,
                    opener1Id: opener1, opener2Id: opener2, bowlerId: bowler,
                    target: prevCompleted.total_runs + 1,
                  },
                }),
              });
              setShowInningsBreak(false);
            }}
          />
        )}
      </div>
    );
  }

  const isCurrentInnings = displayInnings.id === currentInnings?.id;
  const isLive = match.status !== 'result';

  const displayBalls = useMemo(() => balls.filter(b => b.innings_id === displayInnings.id), [balls, displayInnings.id]);
  const sortedBalls = useMemo(() => [...displayBalls].sort((a, b) =>
    (b.over_number * 10 + b.ball_number) - (a.over_number * 10 + a.ball_number)
  ), [displayBalls]);

  const overs = useMemo(() => formatOvers(displayInnings.total_balls), [displayInnings.total_balls]);
  const battingTeamObj = useMemo(() => displayInnings.team_id === team1Obj.id ? team1Obj : team2Obj, [displayInnings.team_id, team1Obj, team2Obj]);
  const bowlingTeamObj = useMemo(() => battingTeamObj.id === team1Obj.id ? team2Obj : team1Obj, [battingTeamObj.id, team1Obj, team2Obj]);

  const crr = useMemo(() => displayInnings.total_balls > 0
    ? Math.round((displayInnings.total_runs / (displayInnings.total_balls / 6)) * 100) / 100
    : 0, [displayInnings.total_runs, displayInnings.total_balls]);
  const target = displayInnings.target ?? null;
  const needed = useMemo(() => target ? Math.max(0, target - displayInnings.total_runs) : null, [target, displayInnings.total_runs]);
  const ballsLeft = useMemo(() => match.overs * 6 - displayInnings.total_balls, [match.overs, displayInnings.total_balls]);
  const rrr = useMemo(() => target && ballsLeft > 0
    ? Math.round(((target - displayInnings.total_runs) / (ballsLeft / 6)) * 100) / 100
    : null, [target, displayInnings.total_runs, ballsLeft]);

  const battingPlayers = useMemo(() => players.filter(p => p.team_id === displayInnings.team_id || p.is_joker), [players, displayInnings.team_id]);
  const bowlingPlayers = useMemo(() => players.filter(p => p.team_id === bowlingTeamObj.id || p.is_joker), [players, bowlingTeamObj.id]);
  const overHistory = useMemo(() => buildOverHistory(displayBalls), [displayBalls]);

  const lastBall = useMemo(() => displayBalls.length > 0 ? displayBalls[displayBalls.length - 1] : null, [displayBalls]);
  const strikerId = useMemo(() => isCurrentInnings && lastBall ? lastBall.batsman_id : '', [isCurrentInnings, lastBall]);
  const currentBowlerId = useMemo(() => isCurrentInnings && lastBall ? lastBall.bowler_id : '', [isCurrentInnings, lastBall]);

  const currentOverNum = useMemo(() => Math.floor(displayInnings.total_balls / 6), [displayInnings.total_balls]);

  const prevInnings = useMemo(() => inningsList.find(i => i.status === 'complete') ?? null, [inningsList]);

  // Tab button style helper
  const tabStyle = (t: string) => ({
    flex: 1, padding: '10px', borderRadius: '8px',
    background: activeTab === t ? 'rgba(227,27,35,.12)' : 'transparent',
    color: activeTab === t ? '#fca5a5' : 'var(--muted)',
    border: activeTab === t ? '1px solid rgba(227,27,35,.2)' : '1px solid transparent',
    fontSize: '11px', fontWeight: 800 as const, cursor: 'pointer',
    fontFamily: 'Barlow, sans-serif', letterSpacing: '.6px', textTransform: 'uppercase' as const,
    transition: 'all .2s ease',
  });

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '24px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

      {/* Sticky score header */}
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

      {/* Owner admin controls */}
      {isOwner && code && match.status !== 'result' && (
        <div style={{ margin: '8px 14px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              await fetch(`/api/match/${code}/action`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: match.is_paused ? 'resume_match' : 'pause_match', data: { matchId: match.id } }),
              });
            }}
            style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--muted)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
          >
            {match.is_paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={() => setShowManageTeams(true)}
            style={{ background: 'rgba(10,132,255,.08)', border: '1px solid rgba(10,132,255,.2)', color: 'var(--blue)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
          >
            👥 Teams
          </button>
          <button
            onClick={() => router.push(`/match/${code}/speed`)}
            style={{ background: 'rgba(48,209,88,.08)', border: '1px solid rgba(48,209,88,.2)', color: 'var(--green)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
          >
            📷 Speed
          </button>
          <button
            onClick={() => {
              if (confirm('Cancel this match?')) {
                fetch(`/api/match/${code}/action`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'cancel_match', data: { matchId: match.id } }),
                });
              }
            }}
            style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
          >
            ✕ Cancel
          </button>
          {/* Overs editor — 1st innings or innings break only */}
          {(match.status === 'innings_1' || match.status === 'innings_break') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '4px 10px', border: '1px solid rgba(255,255,255,.08)', flexWrap: 'wrap', width: '100%' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, fontFamily: 'Barlow, sans-serif', whiteSpace: 'nowrap' }}>Overs:</span>
              {[3, 5, 6, 8, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={async () => {
                    await fetch(`/api/match/${code}/action`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'update_overs', data: { matchId: match.id, overs: n } }),
                    });
                  }}
                  style={{
                    width: '28px', height: '24px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', border: 'none', fontFamily: 'Barlow, sans-serif',
                    background: match.overs === n ? '#e31b23' : 'rgba(255,255,255,.08)',
                    color: match.overs === n ? '#fff' : 'var(--muted)',
                  }}
                >{n}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Owner result controls */}
      {isOwner && code && match.status === 'result' && match.result && (
        <div style={{ margin: '12px 14px 0', background: 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(34,197,94,.03))', border: '1px solid rgba(34,197,94,.2)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🏆</div>
          <p style={{ color: '#22c55e', fontWeight: 800, fontSize: '15px', fontFamily: 'Barlow, sans-serif', marginBottom: '14px' }}>{match.result}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Overs picker for the next match */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,.05)', borderRadius: '10px', padding: '8px 12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, fontFamily: 'Barlow, sans-serif', flex: 1 }}>Overs</span>
              {[3, 5, 6, 8, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayAgainOvers(n)}
                  style={{
                    width: '30px', height: '26px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: (playAgainOvers || match.overs) === n ? '#e31b23' : 'rgba(255,255,255,.08)',
                    color: (playAgainOvers || match.overs) === n ? '#fff' : 'var(--muted)',
                    fontFamily: 'Barlow, sans-serif',
                  }}
                >{n}</button>
              ))}
            </div>
            <button
              onClick={async () => {
                const res = await fetch(`/api/match/${code}/action`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'new_match', data: { overs: playAgainOvers || match.overs, team1Id: match.team1_id, team2Id: match.team2_id, matchNumber: inningsList.length > 0 ? Math.ceil(inningsList.length / 2) + 1 : 2 }}),
                });
                if (res.ok) router.push(`/match/${code}/toss`);
              }}
              style={{ background: '#e31b23', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
            >
              Play Again — Same Teams
            </button>
            <button
              onClick={async () => {
                await fetch(`/api/match/${code}/action`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'reset_teams', data: {} }),
                });
                router.push(`/match/${code}/lobby`);
              }}
              style={{ background: 'rgba(255,255,255,.06)', color: 'var(--txt)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
            >
              Rearrange Teams
            </button>
          </div>
        </div>
      )}

      {/* Chase bar */}
      {target && needed !== null && isCurrentInnings && isLive && (
        <div style={{ margin: '12px 14px 0', background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.18)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700 }}>Chase</div>
            <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: '#fca5a5', lineHeight: 1, marginTop: '2px' }}>
              {needed} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>needed</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700 }}>RRR · Balls</div>
            <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: '#fca5a5', lineHeight: 1, marginTop: '2px' }}>
              {rrr?.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>· {ballsLeft}b</span>
            </div>
          </div>
        </div>
      )}

      {/* Innings toggle */}
      {inningsList.length > 1 && (
        <div style={{ display: 'flex', background: 'var(--s2)', borderRadius: '10px', padding: '3px', margin: '12px 14px 0', border: '1px solid var(--border)' }}>
          {inningsList.map(inn => {
            const t = inn.team_id === team1Obj.id ? team1Obj : team2Obj;
            const active = activeInningsId === inn.id;
            return (
              <button key={inn.id} onClick={() => setActiveInningsId(inn.id)} style={{
                flex: 1, padding: '9px', borderRadius: '8px',
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

      {/* Tab bar: LIVE | STATS | SCORECARD */}
      <div style={{ display: 'flex', margin: '12px 14px 0', background: 'var(--s1)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)', gap: '3px' }}>
        {(['live', 'stats', 'scorecard'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
            {t === 'live' ? '⚡ Live' : t === 'stats' ? '📊 Stats' : '📋 Card'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px 0' }}>

        {/* ─── LIVE TAB ─── */}
        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Current over dots strip */}
            {isCurrentInnings && isLive && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px' }}>
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
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>On Field</span>
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: i === 0 ? 'linear-gradient(135deg,#e31b23,#b91c1c)' : 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: i === 0 ? '#fff' : 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {p.name[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                              {p.name} {i === 0 && <span style={{ color: 'var(--live)', fontSize: '10px' }}>*</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
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
                      <div key={currentBowlerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--blue)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {p.name[0]}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>{p.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                          <span style={{ color: 'var(--blue)' }}>{Math.floor(legal / 6)}.{legal % 6}</span>
                          <span style={{ color: 'var(--muted)' }}>-{runs}-</span>
                          <span style={{ color: wkts > 0 ? '#f87171' : 'var(--muted)' }}>{wkts}w</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            {/* Commentary feed */}
            {sortedBalls.length > 0 && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '3px', height: '14px', background: 'var(--live)', borderRadius: '2px' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Commentary</span>
                </div>
                <div ref={feedRef}>
                  {sortedBalls.map((b, idx) => {
                    const lbl = ballLabel(b);
                    const batsman = players.find(p => p.id === b.batsman_id);
                    const bowler = players.find(p => p.id === b.bowler_id);
                    const event = ballEvent(b, batsman, bowler);
                    return (
                      <div key={b.id ?? idx} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        background: b.is_wicket ? 'rgba(239,68,68,.04)' : b.runs_off_bat === 6 ? 'rgba(124,58,237,.04)' : b.runs_off_bat === 4 ? 'rgba(251,191,36,.03)' : 'transparent',
                      }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px', background: lbl.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: lbl.text.length > 1 ? '11px' : '16px', fontWeight: 900,
                          fontFamily: 'Barlow Condensed, sans-serif', color: lbl.color, flexShrink: 0,
                        }}>{lbl.text}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>{event}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {b.over_number + 1}.{b.ball_number} · {batsman?.name ?? ''} · {bowler?.name ?? ''}
                            {(b as any).ball_speed_kmh && (
                              <span style={{
                                background: (b as any).ball_speed_kmh >= 135 ? 'rgba(239,68,68,.15)' : (b as any).ball_speed_kmh >= 120 ? 'rgba(249,115,22,.12)' : 'rgba(10,132,255,.1)',
                                color: (b as any).ball_speed_kmh >= 135 ? '#f87171' : (b as any).ball_speed_kmh >= 120 ? 'var(--live)' : 'var(--blue)',
                                borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: 700,
                              }}>
                                ⚡ {Math.round((b as any).ball_speed_kmh)} km/h
                              </span>
                            )}
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
              <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Overs</span>
                </div>
                <div style={{ padding: '4px 16px' }}>
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

        {/* ─── STATS TAB ─── */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Batting card */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
                  {battingTeamObj.name} — Batting
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BattingTable players={battingPlayers} balls={displayBalls} strikerId={strikerId} />
              </div>
            </div>

            {/* Bowling card */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', background: 'var(--blue)', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
                  {bowlingTeamObj.name} — Bowling
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BowlingTable players={bowlingPlayers} balls={displayBalls} />
              </div>
            </div>

            {/* Previous innings stats */}
            {prevInnings && displayInnings.id !== prevInnings.id && (
              <>
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '16px', background: 'var(--muted)', borderRadius: '2px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
                      1st Innings — Batting
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <BattingTable players={players.filter(p => p.team_id === prevInnings.team_id)} balls={balls.filter(b => b.innings_id === prevInnings.id)} strikerId="" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── SCORECARD TAB ─── */}
        {activeTab === 'scorecard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Batting</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BattingTable players={battingPlayers} balls={displayBalls} strikerId={strikerId} />
              </div>
            </div>
            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', background: 'var(--blue)', borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Bowling</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <BowlingTable players={bowlingPlayers} balls={displayBalls} />
              </div>
            </div>

            {/* Charts under Scorecard */}
            {displayBalls.length > 0 && (
              <>
                <FallOfWickets balls={displayBalls} />
                
                {overHistory.length > 0 && (
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '10px', fontFamily: 'Barlow, sans-serif' }}>Run Progression</div>
                    <WormGraph
                      team1Overs={overHistory}
                      totalOvers={match.overs}
                      team1Name={battingTeamObj?.name}
                    />
                  </div>
                )}

                <ManhattanChart
                  overHistory={overHistory}
                  totalOvers={match.overs}
                  teamName={battingTeamObj?.name}
                />
              </>
            )}
          </div>
        )}

      </div>

      {/* Manage Teams Sheet */}
      {isOwner && code && (
        <ManageTeamsSheet
          isOpen={showManageTeams}
          onClose={() => setShowManageTeams(false)}
          players={players}
          teams={[team1Obj, team2Obj].filter(Boolean) as any}
          matchId={match.id}
          code={code}
          onUpdate={() => { /* realtime subscription handles refresh */ }}
        />
      )}
    </div>
  );
});

export default SpectatorView;
