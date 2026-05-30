'use client';
import React, { useState, useEffect, use } from 'react';
import { useRealtimeMatch } from '@/lib/hooks/useRealtimeMatch';
import { useMatchState } from '@/lib/hooks/useMatchState';
import ScoreHeader from '@/components/scoring/ScoreHeader';
import ScoringPad from '@/components/scoring/ScoringPad';
import BatsmanCard from '@/components/scoring/BatsmanCard';
import BowlerCard from '@/components/scoring/BowlerCard';
import OverDots from '@/components/scoring/OverDots';
import WormGraph from '@/components/scoring/WormGraph';
import BottomTabBar from '@/components/nav/BottomTabBar';
import WicketSheet from '@/components/sheets/WicketSheet';
import PlayerSelectSheet from '@/components/sheets/PlayerSelectSheet';
import TossSheet from '@/components/sheets/TossSheet';
import InningsBreakSheet from '@/components/sheets/InningsBreakSheet';
import BattingTable from '@/components/scorecard/BattingTable';
import BowlingTable from '@/components/scorecard/BowlingTable';
import SessionStandings from '@/components/scorecard/SessionStandings';
import type { WicketType, ExtraType, Team } from '@/types/cricket';
import { buildOverHistory, calcBowlerStats, calcBatsmanStats } from '@/lib/cricket/engine';

interface PageProps { params: Promise<{ code: string }> }

export default function MatchPage({ params }: PageProps) {
  const { code } = use(params);
  const [activeTab, setActiveTab] = useState('score');
  const [playerName, setPlayerName] = useState('');
  const [isScorer, setIsScorer] = useState(false);

  // Sheet states
  const [showWicket, setShowWicket] = useState(false);
  const [showBowler, setShowBowler] = useState(false);
  const [showBatsman, setShowBatsman] = useState(false);
  const [showToss, setShowToss] = useState(false);
  const [showInningsBreak, setShowInningsBreak] = useState(false);

  // Current on-field state (persisted in memory, updated after each ball)
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  const { match, innings, balls, players, loading, error } = useRealtimeMatch(code);

  useEffect(() => {
    const name = localStorage.getItem('cricket_player_name') ?? '';
    setPlayerName(name);
  }, []);

  useEffect(() => {
    if (!players.length || !playerName) return;
    const me = players.find(p => p.name === playerName);
    setIsScorer(me?.is_scorer ?? false);
  }, [players, playerName]);

  // Sync field state from last ball
  useEffect(() => {
    if (!balls.length) return;
    const last = balls[balls.length - 1];
    if (!strikerId) setStrikerId(last.batsman_id);
    if (!nonStrikerId) setNonStrikerId(last.non_striker_id);
    if (!bowlerId) setBowlerId(last.bowler_id);
  }, [balls]);

  const currentInnings = innings.find(i => i.status === 'active') ?? null;
  const prevInnings = innings.find(i => i.status === 'complete') ?? null;
  const inningsBalls = currentInnings ? balls.filter(b => b.innings_id === currentInnings.id) : [];
  const overHistory = buildOverHistory(inningsBalls);
  const currentOverNum = currentInnings ? Math.floor(currentInnings.total_balls / 6) : 0;
  const currentOverBalls = inningsBalls.filter(b => b.over_number === currentOverNum).map(b => {
    const { ballToSummary } = require('@/lib/cricket/engine');
    return ballToSummary(b);
  });

  // Teams
  const team1 = players.filter(p => p.team_id === match?.team1_id);
  const team2 = players.filter(p => p.team_id === match?.team2_id);
  const battingPlayers = currentInnings ? players.filter(p => p.team_id === currentInnings.team_id) : [];
  const bowlingTeamId = currentInnings
    ? (currentInnings.team_id === match?.team1_id ? match?.team2_id : match?.team1_id)
    : null;
  const bowlingPlayers = bowlingTeamId ? players.filter(p => p.team_id === bowlingTeamId) : [];
  const fieldingTeamPlayers = bowlingPlayers;

  const striker = players.find(p => p.id === strikerId);
  const nonStriker = players.find(p => p.id === nonStrikerId);
  const bowler = players.find(p => p.id === bowlerId);

  const strikerStats = striker ? calcBatsmanStats(striker, inningsBalls, true) : null;
  const nonStrikerStats = nonStriker ? calcBatsmanStats(nonStriker, inningsBalls, false) : null;
  const bowlerStats = bowler ? calcBowlerStats(bowler, inningsBalls) : null;

  const crr = currentInnings && currentInnings.total_balls > 0
    ? Math.round((currentInnings.total_runs / (currentInnings.total_balls / 6)) * 100) / 100
    : 0;
  const rrr = currentInnings?.target && currentInnings.total_balls < (match?.overs ?? 0) * 6
    ? Math.round(((currentInnings.target - currentInnings.total_runs) / (((match?.overs ?? 0) * 6 - currentInnings.total_balls) / 6)) * 100) / 100
    : null;
  const isFreehitNext = inningsBalls[inningsBalls.length - 1]?.extra_type === 'noball';

  const postBall = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/match/${code}/ball`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, scorerName: playerName, strikerId, nonStrikerId, bowlerId }),
    });
    const result = await res.json();
    if (result.success) {
      if (result.newStrikerId) setStrikerId(result.newStrikerId);
      if (result.newNonStrikerId) setNonStrikerId(result.newNonStrikerId);
      if (result.overComplete && !result.inningsOver) setShowBowler(true);
      if (result.inningsOver) {
        await fetch(`/api/match/${code}/action`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'innings_end', data: { inningsId: currentInnings?.id, matchId: match?.id } }),
        });
        setShowInningsBreak(true);
      }
    }
  };

  const handleScore = (runs: number, extraType?: ExtraType, extraRuns?: number) => {
    postBall({ runsOffBat: runs, extraType, extraRuns: extraRuns ?? 0 });
  };

  const handleWicket = (_runsOffBat?: number) => {
    setShowWicket(true);
  };

  const handleWicketConfirm = async (wicketType: WicketType, fielderId?: string) => {
    const res = await fetch(`/api/match/${code}/wicket`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wicketType, fielderId, scorerName: playerName, strikerId, nonStrikerId, bowlerId }),
    });
    const result = await res.json();
    if (result.success) {
      if (!result.allOut) {
        setShowBatsman(true);
        if (result.overComplete) setShowBowler(true);
      } else {
        setShowInningsBreak(true);
      }
    }
  };

  if (loading) return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-4)' }}>🏏</div>
        <p style={{ color: 'var(--text-3)' }}>Loading match…</p>
      </div>
    </main>
  );

  if (error || !match) return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <p style={{ color: 'var(--red)' }}>{error ?? 'Match not found'}</p>
        <a href="/join" className="btn btn-secondary" style={{ marginTop: 'var(--sp-4)' }}>← Back</a>
      </div>
    </main>
  );

  const team1Obj = match ? { id: match.team1_id!, name: team1[0]?.name ?? 'Team A', session_id: '', created_at: '' } as Team : null;
  const team2Obj = match ? { id: match.team2_id!, name: team2[0]?.name ?? 'Team B', session_id: '', created_at: '' } as Team : null;
  const battingTeamObj = currentInnings?.team_id === match?.team1_id ? team1Obj : team2Obj;
  const bowlingTeamObj = currentInnings?.team_id === match?.team1_id ? team2Obj : team1Obj;

  return (
    <>
      <main className="main-content">
        {/* Fixed score header */}
        {currentInnings && (
          <ScoreHeader
            innings={currentInnings}
            match={match}
            battingTeam={battingTeamObj}
            bowlingTeam={bowlingTeamObj}
            crr={crr}
            rrr={rrr}
            projectedScore={currentInnings.total_balls > 0 ? Math.round(crr * match.overs) : 0}
            isFreehitNext={isFreehitNext}
          />
        )}

        {/* Match result banner */}
        {match.status === 'result' && match.result && (
          <div className="card card-glow-green" style={{ margin: 'var(--sp-4)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--sp-2)' }}>🏆</div>
            <p style={{ color: 'var(--green)', fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.125rem' }}>
              {match.result}
            </p>
          </div>
        )}

        <div style={{ padding: 'var(--sp-3)', paddingBottom: isScorer ? '320px' : '80px' }}>

          {/* SCORE TAB */}
          {activeTab === 'score' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {strikerStats && <BatsmanCard batsman={strikerStats} />}
              {nonStrikerStats && <BatsmanCard batsman={nonStrikerStats} />}
              {bowlerStats && <BowlerCard bowler={bowlerStats} />}

              {/* Current over */}
              {currentOverBalls.length > 0 && (
                <div className="card card-compact">
                  <OverDots balls={currentOverBalls} overNumber={currentOverNum + 1} maxBalls={match.overs > 0 ? 6 : 6} />
                </div>
              )}

              {/* Worm */}
              {overHistory.length > 0 && (
                <div className="card card-compact">
                  <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>Run Progression</p>
                  <WormGraph
                    team1Overs={overHistory}
                    totalOvers={match.overs}
                    team1Name={battingTeamObj?.name}
                  />
                </div>
              )}

              {/* Recent overs */}
              {overHistory.slice(-3).reverse().map(ov => (
                <div key={ov.overNumber} className="card card-compact">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                    <span className="label">Over {ov.overNumber}</span>
                    <span style={{ color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600 }}>
                      {ov.runs} runs {ov.wickets > 0 ? `· ${ov.wickets}W` : ''} {ov.isMaiden ? '· Maiden 🌟' : ''}
                    </span>
                  </div>
                  <OverDots balls={ov.balls} overNumber={ov.overNumber} />
                </div>
              ))}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="card">
                <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Batting</h3>
                <BattingTable players={battingPlayers} balls={inningsBalls} strikerId={strikerId} />
              </div>
              <div className="card">
                <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Bowling</h3>
                <BowlingTable players={bowlingPlayers} balls={inningsBalls} />
              </div>
              {prevInnings && (
                <div className="card">
                  <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>1st Innings Batting</h3>
                  <BattingTable
                    players={players.filter(p => p.team_id === prevInnings.team_id)}
                    balls={balls.filter(b => b.innings_id === prevInnings.id)}
                    strikerId=""
                  />
                </div>
              )}
            </div>
          )}

          {/* SCORECARD TAB */}
          {activeTab === 'scorecard' && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Full Scorecard</h3>
              <div style={{ overflowX: 'auto' }}>
                <BattingTable players={battingPlayers} balls={inningsBalls} strikerId={strikerId} />
              </div>
              <div className="divider" />
              <div style={{ overflowX: 'auto' }}>
                <BowlingTable players={bowlingPlayers} balls={inningsBalls} />
              </div>
            </div>
          )}

          {/* SESSION TAB */}
          {activeTab === 'session' && (
            <SessionStandings code={code} />
          )}
        </div>
      </main>

      {/* Scoring pad (scorer only) */}
      {isScorer && currentInnings?.status === 'active' && match.status !== 'result' && (
        <ScoringPad
          onScore={handleScore}
          onWicket={handleWicket}
          onRetiredHurt={() => setShowBatsman(true)}
          isFreehitNext={isFreehitNext}
          disabled={false}
        />
      )}

      {/* Bottom nav */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Sheets */}
      <WicketSheet
        open={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicketConfirm}
        fieldingTeamPlayers={fieldingTeamPlayers}
        runsOffBat={0}
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
        open={showBowler}
        onClose={() => setShowBowler(false)}
        onSelect={id => setBowlerId(id)}
        players={bowlingPlayers}
        title="Select Bowler"
        excludeIds={[]}
      />
      {team1Obj && team2Obj && (
        <TossSheet
          open={showToss}
          onClose={() => setShowToss(false)}
          onConfirm={async (winnerId, decision) => {
            await fetch(`/api/match/${code}/action`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'set_toss', data: { tossWinnerId: winnerId, decision, matchId: match.id } }),
            });
          }}
          team1={team1Obj}
          team2={team2Obj}
        />
      )}
      {currentInnings?.status === 'complete' && prevInnings && team1Obj && team2Obj && (
        <InningsBreakSheet
          open={showInningsBreak}
          target={currentInnings.target ?? 0}
          team1Runs={prevInnings.total_runs}
          team1Name={prevInnings.team_id === team1Obj.id ? team1Obj.name : team2Obj.name}
          team2Name={currentInnings.team_id === team1Obj.id ? team1Obj.name : team2Obj.name}
          overs={match.overs}
          battingPlayers={battingPlayers.map(p => ({ id: p.id, name: p.name }))}
          bowlingPlayers={bowlingPlayers.map(p => ({ id: p.id, name: p.name }))}
          onStartInnings2={async (opener1, opener2, bowler) => {
            await fetch(`/api/match/${code}/action`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'start_innings_2',
                data: {
                  matchId: match.id,
                  battingTeamId: currentInnings.team_id,
                  opener1Id: opener1, opener2Id: opener2, bowlerId: bowler,
                  target: currentInnings.target,
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
    </>
  );
}
