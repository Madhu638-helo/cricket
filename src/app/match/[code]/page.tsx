'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeMatch } from '@/lib/hooks/useRealtimeMatch';
import { useMatchState } from '@/lib/hooks/useMatchState';
import ScoreHeader from '@/components/scoring/ScoreHeader';
import ScoringPad from '@/components/scoring/ScoringPad';
import PlayerStatsCard from '@/components/scoring/PlayerStatsCard';
import OverDots from '@/components/scoring/OverDots';
import WormGraph from '@/components/scoring/WormGraph';
import { MatchTabBar } from '@/components/nav/BottomTabBar';
import WicketSheet from '@/components/sheets/WicketSheet';
import PlayerSelectSheet from '@/components/sheets/PlayerSelectSheet';
import InningsBreakSheet from '@/components/sheets/InningsBreakSheet';
import TransferScorerSheet from '@/components/sheets/TransferScorerSheet';
import AssignPlayersSheet from '@/components/sheets/AssignPlayersSheet';
import ManageTeamsSheet from '@/components/sheets/ManageTeamsSheet';
import BattingTable from '@/components/scorecard/BattingTable';
import BowlingTable from '@/components/scorecard/BowlingTable';
import SessionStandings from '@/components/scorecard/SessionStandings';
import FallOfWickets from '@/components/scoring/FallOfWickets';
import ManhattanChart from '@/components/scoring/ManhattanChart';
import SpectatorView from '@/components/scoring/SpectatorView';
import type { WicketType, ExtraType, Team } from '@/types/cricket';
import { buildOverHistory, calcBowlerStats, calcBatsmanStats, ballToSummary } from '@/lib/cricket/engine';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/components/ui/Toast';

interface PageProps { params: Promise<{ code: string }> }

export default function MatchPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('score');
  const [playerName, setPlayerName] = useState('');
  const [isScorer, setIsScorer] = useState<boolean | null>(null); // null = loading
  const [isOwner, setIsOwner] = useState(false);

  // Sheet states
  const [showWicket, setShowWicket] = useState(false);
  const [showBowler, setShowBowler] = useState(false);
  const [showBatsman, setShowBatsman] = useState(false);
  const [showNonStriker, setShowNonStriker] = useState(false);
  const [showInningsBreak, setShowInningsBreak] = useState(false);
  const [showTransferScorer, setShowTransferScorer] = useState(false);
  const [showAssignPlayers, setShowAssignPlayers] = useState(false);
  const [showManageTeams, setShowManageTeams] = useState(false);

  // Overlays
  const [showSixOverlay, setShowSixOverlay] = useState(false);
  const [showWicketOverlay, setShowWicketOverlay] = useState(false);

  // Current on-field state (persisted in memory, updated after each ball)
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');
  const [pendingBalls, setPendingBalls] = useState<any[]>([]);
  const [submittedTotal, setSubmittedTotal] = useState<{ runs: number; balls: number; wickets: number } | null>(null);
  const [innings1Target, setInnings1Target] = useState<number>(0);
  const [previousOverBowlerId, setPreviousOverBowlerId] = useState<string>('');
  const [playAgainOvers, setPlayAgainOvers] = useState<number>(0); // 0 = inherit from match

  const { session, match, innings, balls, players, teams: teamsFromDb, loading, error, sendScoreUpdate, pendingSpeeds, clearPendingSpeeds } = useRealtimeMatch(code);

  // Auto-close: if match started but still 'active' >30min past expected end, call close action
  useEffect(() => {
    if (!match || match.status === 'result' || match.status === 'setup') return;
    // Estimate: overs * 4min per over * 2 innings (or 1 if innings1 active)
    const inningsCount = innings.filter(i => i.status === 'complete').length + 1;
    const estimatedMinutes = match.overs * 4 * Math.min(inningsCount, 2);
    const matchStartMs = new Date(match.created_at).getTime();
    const expectedEndMs = matchStartMs + estimatedMinutes * 60 * 1000;
    const graceMs = 30 * 60 * 1000;
    if (Date.now() > expectedEndMs + graceMs) {
      fetch(`/api/match/${code}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_close', data: { matchId: match.id } }),
      }).catch(() => {});
    }
  }, [match?.id, match?.status]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) return;
        setPlayerName(user.name);
        if (session) setIsOwner(user.id === session.owner_id);
        
        const me = players.find(p => p.user_id === user.id);
        const activeInnings = innings.find(i => i.status === 'active');
        // Only the batting team's designated scorer can log scores
        // Owner is NOT a scorer — they can only admin (restart/pause/cancel)
        const isBattingTeamScorer = !!(me?.is_scorer && activeInnings && me?.team_id === activeInnings.team_id);
        setIsScorer(isBattingTeamScorer);
      })
      .catch(() => {});
  }, [session, players, innings]);

  // Reset local state when match changes (e.g., "Play Again" creates a new match)
  const prevMatchIdRef = React.useRef(match?.id);
  useEffect(() => {
    if (match?.id && prevMatchIdRef.current && match.id !== prevMatchIdRef.current) {
      setStrikerId('');
      setNonStrikerId('');
      setBowlerId('');
      setPendingBalls([]);
      setSubmittedTotal(null);
      setActiveTab('score');
      setInnings1Target(0);
      setShowInningsBreak(false);
      setShowWicket(false);
      setShowBowler(false);
      setShowBatsman(false);
      setShowNonStriker(false);
    }
    prevMatchIdRef.current = match?.id;
  }, [match?.id]);

  // Sync field state from last ball OR from partnership (for fresh innings)
  useEffect(() => {
    if (balls.length > 0) {
      const last = balls[balls.length - 1];
      if (!strikerId) setStrikerId(last.batsman_id);
      if (!nonStrikerId) setNonStrikerId(last.non_striker_id ?? 'single');
      if (!bowlerId) setBowlerId(last.bowler_id);
    }
  }, [balls]);

  // Pre-fill from partnership data when innings just started (no balls yet)
  useEffect(() => {
    if (strikerId || nonStrikerId) return; // already set
    const activeInn = innings.find(i => i.status === 'active');
    if (!activeInn || !session) return;
    // Fetch partnership to get opener IDs
    const supabaseClient = (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const sb = createClient();
      const { data: partnership } = await sb.from('partnerships')
        .select('batsman1_id,batsman2_id')
        .eq('innings_id', activeInn.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (partnership) {
        if (partnership.batsman1_id && !strikerId) setStrikerId(partnership.batsman1_id);
        if (partnership.batsman2_id && !nonStrikerId) setNonStrikerId(partnership.batsman2_id);
        else if (!partnership.batsman2_id && !nonStrikerId) setNonStrikerId('single');
      }
    })();
  }, [innings, session]);

  const currentInnings = innings.find(i => i.status === 'active') ?? null;
  const prevInnings = innings.find(i => i.status === 'complete') ?? null;
  const dbBalls = currentInnings ? balls.filter(b => b.innings_id === currentInnings.id) : [];
  const inningsBalls = [...dbBalls, ...pendingBalls];
  const overHistory = buildOverHistory(inningsBalls);
  const currentOverNum = currentInnings ? Math.floor(currentInnings.total_balls / 6) : 0;
  const currentOverBalls = inningsBalls.filter(b => b.over_number === currentOverNum).map(b => ballToSummary(b));

  // Teams
  const team1 = players.filter(p => p.team_id === match?.team1_id);
  const team2 = players.filter(p => p.team_id === match?.team2_id);
  const unassignedPlayers = players.filter(p => p.team_id === null && !p.is_joker);
  const jokerPlayers = players.filter(p => p.is_joker);
  const battingPlayers = currentInnings ? [...players.filter(p => p.team_id === currentInnings.team_id && !p.is_joker), ...jokerPlayers] : [];
  const bowlingTeamId = currentInnings
    ? (currentInnings.team_id === match?.team1_id ? match?.team2_id : match?.team1_id)
    : null;
  const bowlingPlayers = bowlingTeamId ? [...players.filter(p => p.team_id === bowlingTeamId && !p.is_joker), ...jokerPlayers] : [];
  const fieldingTeamPlayers = bowlingPlayers;

  const striker = players.find(p => p.id === strikerId);
  const nonStriker = players.find(p => p.id === nonStrikerId);
  const bowler = players.find(p => p.id === bowlerId);

  const strikerStats = striker ? calcBatsmanStats(striker, inningsBalls, true) : null;
  const nonStrikerStats = nonStriker ? calcBatsmanStats(nonStriker, inningsBalls, false) : null;
  const bowlerStats = bowler ? calcBowlerStats(bowler, inningsBalls) : null;

  // Optimistic live innings — merge DB state with pending balls for instant header update
  const pendingRuns = pendingBalls.reduce((s, b) => s + (b.runs_off_bat ?? 0) + (b.extras ?? 0), 0);
  const pendingWickets = pendingBalls.filter(b => b.is_wicket).length;
  const pendingLegal = pendingBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
  const liveInnings = currentInnings ? {
    ...currentInnings,
    // Use max of (DB + pending) vs submittedTotal to prevent revert during API round-trip
    total_runs: Math.max(currentInnings.total_runs + pendingRuns, submittedTotal?.runs ?? 0),
    total_wickets: Math.max(currentInnings.total_wickets + pendingWickets, submittedTotal?.wickets ?? 0),
    total_balls: Math.max(currentInnings.total_balls + pendingLegal, submittedTotal?.balls ?? 0),
  } : null;

  // Clear submittedTotal once DB confirms (realtime innings UPDATE catches up)
  useEffect(() => {
    if (!submittedTotal || !currentInnings) return;
    if (currentInnings.total_balls >= submittedTotal.balls) setSubmittedTotal(null);
  }, [currentInnings?.total_balls]);

  const crr = liveInnings && liveInnings.total_balls > 0
    ? Math.round((liveInnings.total_runs / (liveInnings.total_balls / 6)) * 100) / 100
    : 0;
  const rrr = liveInnings?.target && liveInnings.total_balls < (match?.overs ?? 0) * 6
    ? Math.round(((liveInnings.target - liveInnings.total_runs) / (((match?.overs ?? 0) * 6 - liveInnings.total_balls) / 6)) * 100) / 100
    : null;
  const isFreehitNext = inningsBalls[inningsBalls.length - 1]?.extra_type === 'noball';

  const submitOver = async (overBalls: any[]) => {
    if (overBalls.length === 0) return;
    try {
      const res = await fetch(`/api/match/${code}/over`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balls: overBalls })
      });
      const result = await res.json();
      if (result.success) {
        // Lock in committed totals so score never reverts while waiting for realtime confirm
        setSubmittedTotal({
          runs: currentInnings ? currentInnings.total_runs + pendingRuns : 0,
          balls: currentInnings ? currentInnings.total_balls + pendingLegal : 0,
          wickets: currentInnings ? currentInnings.total_wickets + pendingWickets : 0,
        });
        setPendingBalls([]);
        if (result.inningsOver) {
          const actionRes = await fetch(`/api/match/${code}/action`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'innings_end', data: { inningsId: currentInnings?.id, matchId: match?.id } }),
          });
          const actionData = await actionRes.json();
          if (actionData.target) setInnings1Target(actionData.target);
          setShowInningsBreak(true);
        } else {
          setPreviousOverBowlerId(bowlerId); // track for consecutive-over warning
          setShowBowler(true);
        }
      } else {
        showToast(result.error, 'error');
        setSubmittedTotal(null);
        setPendingBalls([]); // Revert on error
      }
    } catch (e) {
      showToast('Failed to submit over', 'error');
      setSubmittedTotal(null);
      setPendingBalls([]);
    }
  };

  const handleTransferScorer = async (newScorerId: string) => {
    try {
      const myPlayerId = players.find(p => p.user_id === session?.owner_id || p.is_scorer)?.id; // actually we just need my ID
      const me = players.find(p => p.is_scorer && p.team_id === currentInnings?.team_id);
      if (!me) return;
      await fetch(`/api/match/${code}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_scorer', data: { currentScorerId: me.id, newScorerId } }),
      });
      setShowTransferScorer(false);
      showToast('Scorer role transferred', 'success');
      // The real-time subscription will update `isScorer` to false
    } catch (e) {
      showToast('Failed to transfer scorer role', 'error');
    }
  };

  const handleAssignPlayer = async (playerId: string, teamId: string) => {
    try {
      await fetch(`/api/match/${code}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_player', data: { playerId, teamId } }),
      });
      showToast('Player assigned to team', 'success');
      // If no more unassigned players, close the sheet
      if (unassignedPlayers.length <= 1) setShowAssignPlayers(false);
    } catch (e) {
      showToast('Failed to assign player', 'error');
    }
  };

  const processLocalBall = (payload: any) => {
    const isExtra = payload.extra_type === 'wide' || payload.extra_type === 'noball';

    // trigger overlays
    if (payload.runs_off_bat === 6 && !payload.is_wicket && !isExtra) {
      setShowSixOverlay(true);
      setTimeout(() => setShowSixOverlay(false), 2000);
    }
    if (payload.is_wicket) {
      setShowWicketOverlay(true);
      setTimeout(() => setShowWicketOverlay(false), 2000);
    }

    // Use all known balls (committed + pending) for over tracking
    const allLegal = inningsBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
    const currentOversFinished = Math.floor(allLegal / 6);

    const avgSpeed = pendingSpeeds.length > 0 
      ? Math.round(pendingSpeeds.reduce((a, b) => a + b, 0) / pendingSpeeds.length)
      : null;

    const newBall = {
      ...payload,
      innings_id: currentInnings?.id,
      over_number: currentOversFinished,
      ball_number: isExtra ? allLegal % 6 : (allLegal % 6) + 1,
      delivery_number: inningsBalls.length + 1,
      batsman_id: strikerId,
      bowler_id: bowlerId,
      non_striker_id: nonStrikerId,
      is_free_hit: isFreehitNext,
      is_wicket: payload.is_wicket ?? false,
      ball_speed_kmh: avgSpeed,
    };
    
    clearPendingSpeeds();
    
    const newPending = [...pendingBalls, newBall];
    setPendingBalls(newPending);

    // Broadcast live score to all viewers per ball
    if (currentInnings) {
      const totalPR = newPending.reduce((s, b) => s + (b.runs_off_bat ?? 0) + (b.extras ?? 0), 0);
      const totalPW = newPending.filter(b => b.is_wicket).length;
      const totalPL = newPending.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
      sendScoreUpdate(
        currentInnings.id,
        currentInnings.total_runs + totalPR,
        currentInnings.total_wickets + totalPW,
        currentInnings.total_balls + totalPL,
      );
    }

    // Strike rotation — no-ball rotates on odd bat runs (unlike wide, which never rotates)
    const shouldRotate = payload.extra_type !== 'wide' && payload.runs_off_bat % 2 === 1;
    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;

    if (shouldRotate && nonStrikerId !== 'single') {
       nextStriker = nonStrikerId;
       nextNonStriker = strikerId;
    }
    
    const legalInOver = newPending.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
    const overComplete = legalInOver >= 6;
    const wickets = inningsBalls.filter(b => b.is_wicket).length + (payload.is_wicket ? 1 : 0);
    const allOutLimit = battingPlayers.length > 0 ? battingPlayers.length - 1 : 10;
    const allOut = wickets >= allOutLimit;

    const totalPendingRuns = newPending.reduce((s, b) => s + (b.runs_off_bat ?? 0) + (b.extras ?? 0), 0);
    const newTotalRuns = (currentInnings?.total_runs ?? 0) + totalPendingRuns;
    const targetChased = currentInnings?.innings_number === 2 && currentInnings?.target != null && newTotalRuns >= currentInnings.target;
    
    if (overComplete || allOut || targetChased) {
       // auto rotate at over end
       if (overComplete && nextNonStriker !== 'single' && !allOut && !targetChased) {
          const temp = nextStriker;
          nextStriker = nextNonStriker;
          nextNonStriker = temp;
       }
       if (targetChased) {
         showToast('🏆 Target chased! Submitting...', 'success', 2000);
       } else if (allOut) {
         showToast('🏏 All out! Submitting...', 'info', 2000);
       } else {
         showToast('✅ Over complete — submitting...', 'info', 2000);
       }
       submitOver(newPending);
    }
    
    setStrikerId(nextStriker);
    setNonStrikerId(nextNonStriker);
    
    if (payload.is_wicket && !allOut) {
      setShowBatsman(true);
    }
  };

  const handleScore = (runs: number, extraType?: ExtraType, extraRuns?: number) => {
    processLocalBall({ runs_off_bat: runs, extra_type: extraType ?? null, extras: extraRuns ?? 0 });
  };

  const handleWicket = (_runsOffBat?: number) => {
    setShowWicket(true);
  };

  const handleWicketConfirm = async (wicketType: WicketType, fielderId?: string, runsCompleted?: number) => {
    processLocalBall({ runs_off_bat: runsCompleted ?? 0, extra_type: null, extras: 0, is_wicket: true, wicket_type: wicketType, fielder_id: fielderId });
  };

  const undoLastBall = () => {
    if (pendingBalls.length === 0) return; // nothing to undo — already submitted
    const popped = pendingBalls[pendingBalls.length - 1];
    const newPending = pendingBalls.slice(0, -1);
    setPendingBalls(newPending);
    // Reverse strike rotation
    // Mirror the shouldRotate logic: wide never rotates, no-ball rotates on odd bat runs
    const didRotate = popped.extra_type !== 'wide' && (popped.runs_off_bat ?? 0) % 2 === 1 && nonStrikerId !== 'single';
    if (didRotate) {
      setStrikerId(nonStrikerId);
      setNonStrikerId(strikerId);
    }
    // If wicket was undone, restore striker
    if (popped.is_wicket) {
      setStrikerId(popped.batsman_id);
    }
  };

  const swapStrike = () => {
    if (nonStrikerId === 'single') return;
    const temp = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(temp);
  };

  if (loading) return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      {/* Skeleton header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--s2)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: '13px', width: '60%', background: 'var(--s2)', borderRadius: '4px', marginBottom: '6px' }} />
            <div style={{ height: '10px', width: '40%', background: 'var(--s2)', borderRadius: '4px' }} />
          </div>
          <div style={{ width: '48px', height: '28px', background: 'var(--s2)', borderRadius: '8px' }} />
        </div>
        {/* Skeleton scoreboard */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: '10px', width: '40px', background: 'var(--s2)', borderRadius: '3px', marginBottom: '6px' }} />
            <div style={{ height: '46px', width: '120px', background: 'var(--s2)', borderRadius: '6px' }} />
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: '10px', width: '50px', background: 'var(--s2)', borderRadius: '3px', marginBottom: '6px' }} />
            <div style={{ height: '24px', width: '80px', background: 'var(--s2)', borderRadius: '6px' }} />
          </div>
        </div>
        <div style={{ height: '2px', background: 'var(--s2)', borderRadius: '2px', marginTop: '12px' }} />
      </div>
      {/* Skeleton cards */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[80, 120, 200].map(h => (
          <div key={h} style={{ height: `${h}px`, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  );

  if (error || !match) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cricket_session_code');
    }
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <p style={{ color: 'var(--red)' }}>{error ?? 'Match not found'}</p>
          <a href="/join" className="btn btn-ghost" style={{ marginTop: '20px' }}>← Back</a>
        </div>
      </div>
    );
  }

  const team1Obj = match ? teamsFromDb.find(t => t.id === match.team1_id) ?? { id: match.team1_id!, name: 'Team A', session_id: '', created_at: '' } as Team : null;
  const team2Obj = match ? teamsFromDb.find(t => t.id === match.team2_id) ?? { id: match.team2_id!, name: 'Team B', session_id: '', created_at: '' } as Team : null;
  // Show header innings = active OR last completed (so header is never blank)
  const headerInnings = liveInnings ?? prevInnings ?? null;
  const battingTeamObj = (headerInnings ?? currentInnings)?.team_id === match?.team1_id ? team1Obj : team2Obj;
  const bowlingTeamObj = (headerInnings ?? currentInnings)?.team_id === match?.team1_id ? team2Obj : team1Obj;

  if (isScorer === null) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--live)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    );
  }

  if (!isScorer) {
    return (
      <ErrorBoundary>
        <SpectatorView
          match={match}
          inningsList={innings}
          balls={balls}
          players={players}
          team1Obj={team1Obj}
          team2Obj={team2Obj}
          isOwner={isOwner}
          code={code}
          onBack={() => {
            if (typeof window !== 'undefined') window.history.back();
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="screen" id="s-scoring">
        {/* Fixed score header — always shown once we have any innings data */}
        {headerInnings && (
          <ScoreHeader
            innings={headerInnings}
            match={match}
            battingTeam={battingTeamObj}
            bowlingTeam={bowlingTeamObj}
            crr={crr}
            rrr={rrr}
            projectedScore={headerInnings.total_balls > 0 ? Math.round(crr * match.overs) : 0}
            isFreehitNext={isFreehitNext}
            onOpenScorecard={() => setActiveTab('scorecard')}
            previousInnings={prevInnings && headerInnings.id !== prevInnings.id ? prevInnings : null}
            activeTab={activeTab}
            onBackToScore={() => setActiveTab('score')}
          />
        )}

        {/* Match result banner */}
        {match.status === 'result' && match.result && (
          <div style={{ margin: '16px', background: 'linear-gradient(135deg,rgba(34,197,94,.12),rgba(34,197,94,.04))', border: '1px solid rgba(34,197,94,.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
            <p style={{ color: '#22c55e', fontWeight: 800, fontSize: '18px', marginBottom: '20px' }}>
              {match.result}
            </p>
            {isOwner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Overs picker for the next match */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,.05)', borderRadius: '10px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, flex: 1 }}>Overs next match</span>
                  {[3, 5, 6, 8, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setPlayAgainOvers(n)}
                      style={{
                        width: '34px', height: '28px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
                        background: (playAgainOvers || match.overs) === n ? '#e31b23' : 'rgba(255,255,255,.08)',
                        color: (playAgainOvers || match.overs) === n ? '#fff' : 'var(--muted)',
                      }}
                    >{n}</button>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/match/${code}/action`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'new_match', data: {
                        overs: playAgainOvers || match.overs,
                        team1Id: match.team1_id,
                        team2Id: match.team2_id,
                        matchNumber: innings.length > 0 ? Math.ceil(innings.length / 2) + 1 : 2,
                      }}),
                    });
                    if (res.ok) router.push(`/match/${code}/toss`);
                  }}
                  style={{ background: '#e31b23', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Play Again — Same Teams
                </button>
                <button
                  onClick={async () => {
                    // Reset all player team assignments, redirect to lobby to rearrange
                    await fetch(`/api/match/${code}/action`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'reset_teams', data: {} }),
                    });
                    router.push(`/match/${code}/lobby`);
                  }}
                  style={{ background: 'rgba(255,255,255,.08)', color: 'var(--txt)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Rearrange Teams
                </button>
                <button
                  onClick={async () => {
                    await fetch(`/api/match/${code}/action`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'end_session', data: {} }),
                    });
                    router.push('/');
                  }}
                  style={{ background: 'transparent', color: 'var(--muted)', border: 'none', fontSize: '13px', cursor: 'pointer', padding: '6px' }}
                >
                  End Session
                </button>
              </div>
            )}
          </div>
        )}

        {/* Assign Players Banner (Owner Only) */}
        {isOwner && unassignedPlayers.length > 0 && match.status !== 'result' && (
          <div style={{ margin: '16px 16px 8px', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.3)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px' }}>👋</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>{unassignedPlayers.length} Player{unassignedPlayers.length > 1 ? 's' : ''} joined</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Waiting to be assigned</div>
              </div>
            </div>
            <button 
              onClick={() => setShowAssignPlayers(true)}
              style={{ background: 'var(--gold)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Assign
            </button>
          </div>
        )}

        {/* Pause/Resume + Owner Actions for active play */}
        {isOwner && match.status !== 'result' && match.status !== 'setup' && (
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                await fetch(`/api/match/${code}/action`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: match.is_paused ? 'resume_match' : 'pause_match', data: { matchId: match.id } }),
                });
              }}
              style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--muted)', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {match.is_paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={() => setShowManageTeams(true)}
              style={{ background: 'rgba(10,132,255,.08)', border: '1px solid rgba(10,132,255,.2)', color: 'var(--blue)', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              👥 Teams
            </button>
            <button
              onClick={() => router.push(`/match/${code}/speed`)}
              style={{ background: 'rgba(48,209,88,.08)', border: '1px solid rgba(48,209,88,.2)', color: 'var(--green)', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              📷 Speed
            </button>
            {/* Overs editor — only during 1st innings or innings break */}
            {(match.status === 'innings_1' || match.status === 'innings_break') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '4px 10px', border: '1px solid rgba(255,255,255,.08)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Overs:</span>
                {[3, 5, 6, 8, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={async () => {
                      const res = await fetch(`/api/match/${code}/action`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'update_overs', data: { matchId: match.id, overs: n } }),
                      });
                      if (!res.ok) showToast('Cannot change overs now', 'error');
                      else showToast(`Overs changed to ${n}`, 'success');
                    }}
                    style={{
                      width: '30px', height: '24px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer', border: 'none',
                      background: match.overs === n ? 'var(--red)' : 'rgba(255,255,255,.08)',
                      color: match.overs === n ? '#fff' : 'var(--muted)',
                    }}
                  >{n}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '16px', paddingBottom: '80px' }}>

          {/* SCORE TAB */}
          {activeTab === 'score' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Status banner when no active innings */}
              {!currentInnings && match.status !== 'result' && (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px 20px', textAlign: 'center' }}>
                  {match.status === 'innings_break' ? (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>☕</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Barlow, sans-serif', marginBottom: '4px' }}>Innings Break</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                        {prevInnings ? `Target: ${prevInnings.total_runs + 1} runs` : 'Setting up 2nd innings…'}
                      </div>
                      {isOwner && prevInnings && (
                        <button
                          onClick={() => setShowInningsBreak(true)}
                          style={{ marginTop: '16px', background: 'var(--live)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
                        >
                          Start 2nd Innings →
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏏</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'Barlow, sans-serif', marginBottom: '4px' }}>Setting up match</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>Waiting for innings to start…</div>
                    </>
                  )}
                </div>
              )}

              {currentInnings && isScorer && (!strikerId || !nonStrikerId || !bowlerId) && (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '12px', fontFamily: 'Barlow, sans-serif' }}>Select Players</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!strikerId && (
                       <button className="btn btn-ghost btn-full" onClick={() => setShowBatsman(true)}>Select Striker</button>
                    )}
                    {strikerId && !nonStrikerId && (
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNonStriker(true)}>Select Non-Striker</button>
                         <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setNonStrikerId('single')}>Play Solo</button>
                       </div>
                    )}
                    {!bowlerId && (
                       <button className="btn btn-ghost btn-full" onClick={() => setShowBowler(true)}>Select Bowler</button>
                    )}
                  </div>
                </div>
              )}
              {(strikerStats || bowlerStats) && (
                <PlayerStatsCard 
                  striker={strikerStats}
                  nonStriker={nonStrikerStats}
                  bowler={bowlerStats}
                  currentOverBalls={currentOverBalls}
                  maxBallsPerOver={match.overs > 0 ? 6 : 6}
                  currentOverNum={currentOverNum + 1}
                />
              )}

              {/* Scoring pad (scorer only) */}
              {isScorer && currentInnings?.status === 'active' && match.status !== 'result' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '-4px' }}>
                    {/* Undo last committed over — only available between overs */}
                    {pendingBalls.length === 0 && overHistory.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!confirm('Undo the entire last over? This will delete those balls and recalculate the score.')) return;
                          try {
                            await fetch(`/api/match/${code}/action`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'undo_last_over', data: { inningsId: currentInnings?.id, matchId: match?.id } }),
                            });
                            showToast('Last over undone', 'info');
                          } catch {
                            showToast('Failed to undo last over', 'error');
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
                      >
                        ↩ Undo Last Over
                      </button>
                    )}
                      <button
                        onClick={() => setShowTransferScorer(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px', marginLeft: 'auto' }}
                      >
                        ⇄ Handover Scorer
                      </button>
                    </div>

                    {/* Speed indicator */}
                    {pendingSpeeds.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 12px', background: 'rgba(48,209,88,.1)', border: '1px solid rgba(48,209,88,.2)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '14px' }}>⚡</span>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>
                          Speed tracked: {Math.round(pendingSpeeds.reduce((a, b) => a + b, 0) / pendingSpeeds.length)} km/h
                          {pendingSpeeds.length > 1 && <span style={{ opacity: 0.6 }}> (avg from {pendingSpeeds.length} devices)</span>}
                        </div>
                        <button
                          onClick={clearPendingSpeeds}
                          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}
                        >✕</button>
                      </div>
                    )}

                    <ScoringPad
                    onScore={handleScore}
                    onWicket={handleWicket}
                    onRetiredHurt={() => setShowBatsman(true)}
                    onUndo={undoLastBall}
                    onSwapStrike={swapStrike}
                    onEndOverEarly={pendingBalls.length > 0 ? () => {
                      showToast('⏩ Ending over early...', 'info', 2000);
                      submitOver(pendingBalls);
                    } : undefined}
                    isFreehitNext={isFreehitNext}
                    canUndo={pendingBalls.length > 0}
                    disabled={showBatsman || showBowler || showWicket || showNonStriker}
                  />
                  <FallOfWickets balls={inningsBalls} />
                </>
              )}

              {/* Worm */}
              {/* Worm */}
              {overHistory.length > 0 && (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '10px', fontFamily: 'Barlow, sans-serif' }}>Run Progression</div>
                  <WormGraph
                    team1Overs={overHistory}
                    totalOvers={match.overs}
                    team1Name={battingTeamObj?.name}
                  />
                </div>
              )}

              {/* Manhattan */}
              <ManhattanChart
                overHistory={overHistory}
                totalOvers={match.overs}
                teamName={battingTeamObj?.name}
              />

              {/* All overs — scrollable history */}
              {overHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '8px', fontFamily: 'Barlow, sans-serif' }}>
                    Over by Over ({overHistory.length} overs)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {[...overHistory].reverse().map(ov => (
                      <div key={ov.overNumber} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>Over {ov.overNumber}</span>
                          <span style={{ color: ov.wickets > 0 ? '#f87171' : 'var(--muted)', fontSize: '12px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                            {ov.runs} runs {ov.wickets > 0 ? `· ${ov.wickets}W` : ''} {ov.isMaiden ? '· M' : ''}
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

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!currentInnings && match.status !== 'result' ? (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                  Stats appear once match begins
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
                        {battingTeamObj?.name ?? 'Batting'} — Batting
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <BattingTable players={battingPlayers} balls={inningsBalls} strikerId={strikerId} />
                    </div>
                  </div>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '16px', background: 'var(--blue)', borderRadius: '2px' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>
                        {bowlingTeamObj?.name ?? 'Bowling'} — Bowling
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <BowlingTable players={bowlingPlayers} balls={inningsBalls} />
                    </div>
                  </div>
                  <FallOfWickets balls={inningsBalls} />
                  <WormGraph
                    team1Overs={overHistory}
                    team2Overs={prevInnings ? buildOverHistory(balls.filter(b => b.innings_id === prevInnings.id)) : undefined}
                    totalOvers={match.overs}
                    team1Name={battingTeamObj?.name}
                    team2Name={bowlingTeamObj?.name}
                  />
                  {prevInnings && (
                    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '4px', height: '16px', background: 'var(--muted)', borderRadius: '2px' }} />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>1st Innings — Batting</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <BattingTable players={players.filter(p => p.team_id === prevInnings.team_id)} balls={balls.filter(b => b.innings_id === prevInnings.id)} strikerId="" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* SCORECARD TAB */}
          {activeTab === 'scorecard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!currentInnings && match.status !== 'result') ? (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                  Scorecard appears once match begins
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Batting</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <BattingTable players={battingPlayers} balls={inningsBalls} strikerId={strikerId} />
                    </div>
                  </div>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '16px', background: 'var(--blue)', borderRadius: '2px' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Bowling</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <BowlingTable players={bowlingPlayers} balls={inningsBalls} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SESSION TAB */}
          {activeTab === 'session' && (
            <SessionStandings code={code} />
          )}
        </div>
      </div>

      {/* Admin controls */}
      {isOwner && match.status !== 'result' && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', background: 'rgba(0,0,0,.95)', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
            onClick={() => fetch(`/api/match/${code}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: match.status === 'innings_1' || match.status === 'innings_2' ? 'pause_match' : 'resume_match', data: { matchId: match.id } }) })}
          >
            {(match as any).is_paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, padding: '8px', fontSize: '12px' }}
            onClick={() => { if (confirm('Cancel this match?')) fetch(`/api/match/${code}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel_match', data: { matchId: match.id } }) }); }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <MatchTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Sheets */}
      <WicketSheet
        open={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicketConfirm}
        fieldingTeamPlayers={fieldingTeamPlayers}
        runsOffBat={0}
        isFreehit={isFreehitNext}
        strikerId={strikerId}
        nonStrikerId={nonStrikerId}
        battingPlayers={battingPlayers}
      />
      <PlayerSelectSheet
        open={showBatsman}
        onClose={() => setShowBatsman(false)}
        onSelect={id => setStrikerId(id)}
        players={battingPlayers}
        title="New Batsman"
        excludeIds={[strikerId, nonStrikerId]}
      />
      <PlayerSelectSheet
        open={showNonStriker}
        onClose={() => setShowNonStriker(false)}
        onSelect={id => setNonStrikerId(id)}
        players={battingPlayers}
        title="Select Non-Striker"
        excludeIds={[strikerId]}
      />
      <PlayerSelectSheet
        open={showBowler}
        onClose={() => setShowBowler(false)}
        onSelect={id => {
          if (id === previousOverBowlerId) {
            showToast('⚠️ Same bowler — consecutive overs!', 'error', 3000);
          }
          setBowlerId(id);
        }}
        players={bowlingPlayers}
        title="Select Bowler"
        excludeIds={[]}
        featuredId={previousOverBowlerId || bowlerId}
        featuredLabel="PREV OVER"
      />

      {/* Overlays */}
      {showSixOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', animation: 'fadeInOut 2s forwards' }}>
          <img src="/action_six.png" alt="SIX!" style={{ width: '80%', maxWidth: '300px', objectFit: 'contain', animation: 'popZoom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
        </div>
      )}
      {showWicketOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', animation: 'fadeInOut 2s forwards' }}>
          <img src="/action_wicket.png" alt="WICKET!" style={{ width: '80%', maxWidth: '300px', objectFit: 'contain', animation: 'popZoom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
        </div>
      )}

      {showInningsBreak && prevInnings && team1Obj && team2Obj && (
        <InningsBreakSheet
          open={showInningsBreak}
          target={innings1Target || prevInnings.total_runs + 1}
          team1Runs={prevInnings.total_runs}
          team1Name={prevInnings.team_id === team1Obj.id ? team1Obj.name : team2Obj.name}
          team2Name={prevInnings.team_id === team1Obj.id ? team2Obj.name : team1Obj.name}
          overs={match.overs}
          battingPlayers={players.filter(p => p.team_id !== prevInnings.team_id || p.is_joker).map(p => ({ id: p.id, name: p.name }))}
          bowlingPlayers={players.filter(p => p.team_id === prevInnings.team_id || p.is_joker).map(p => ({ id: p.id, name: p.name }))}
          onStartInnings2={async (opener1, opener2, bowler) => {
            const inn2TeamId = prevInnings.team_id === match.team1_id ? match.team2_id : match.team1_id;
            await fetch(`/api/match/${code}/action`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'start_innings_2',
                data: {
                  matchId: match.id,
                  battingTeamId: inn2TeamId,
                  opener1Id: opener1, opener2Id: opener2, bowlerId: bowler,
                  target: innings1Target || prevInnings.total_runs + 1,
                },
              }),
            });
            setStrikerId(opener1);
            setNonStrikerId(opener2);
            setBowlerId(bowler);
            setShowInningsBreak(false);
          }}
        />
      )}

      {/* Transfer Scorer Sheet */}
      <TransferScorerSheet
        isOpen={showTransferScorer}
        onClose={() => setShowTransferScorer(false)}
        teamPlayers={players.filter(p => p.team_id === currentInnings?.team_id)}
        currentScorerId={players.find(p => p.user_id === session?.owner_id || p.is_scorer)?.id || ''} // Using ID directly, wait... Actually we just need current scorer id
        onTransfer={handleTransferScorer}
      />

      {/* Assign Players Sheet */}
      <AssignPlayersSheet
        isOpen={showAssignPlayers}
        onClose={() => setShowAssignPlayers(false)}
        unassignedPlayers={unassignedPlayers}
        teams={teamsFromDb}
        onAssign={handleAssignPlayer}
      />

      {/* Manage Teams Sheet */}
      <ManageTeamsSheet
        isOpen={showManageTeams}
        onClose={() => setShowManageTeams(false)}
        players={players}
        teams={teamsFromDb}
        matchId={match.id}
        code={code}
        onUpdate={() => { /* realtime subscription handles refresh */ }}
      />
    </ErrorBoundary>
  );
}
