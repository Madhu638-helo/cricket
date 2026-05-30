'use client';
import { useMemo } from 'react';
import type { Ball, Innings, Match, Player, Team, LiveMatchState } from '@/types/cricket';
import {
  calcBatsmanStats, calcBowlerStats, buildOverHistory, ballToSummary,
  calcCRR, calcRRR, calcProjectedScore
} from '@/lib/cricket/engine';

interface UseMatchStateProps {
  match: Match | null;
  innings: Innings[];
  balls: Ball[];
  players: Player[];
  teams: { team1: Team | null; team2: Team | null };
}

export function useMatchState({ match, innings, balls, players, teams }: UseMatchStateProps): LiveMatchState | null {
  return useMemo(() => {
    if (!match || !teams.team1 || !teams.team2) return null;

    const currentInnings = innings.find(i => i.status === 'active') ?? null;
    const previousInnings = innings.find(i => i.status === 'complete') ?? null;
    const inningsBalls = currentInnings
      ? balls.filter(b => b.innings_id === currentInnings.id)
      : [];

    // Identify current batsmen from last ball
    const lastBall = inningsBalls[inningsBalls.length - 1];
    const strikerBallsId = lastBall?.batsman_id;
    const nonStrikerId = lastBall?.non_striker_id;

    const striker = players.find(p => p.id === strikerBallsId) ?? null;
    const nonStriker = players.find(p => p.id === nonStrikerId) ?? null;
    const bowler = players.find(p => p.id === lastBall?.bowler_id) ?? null;

    const strikerStats = striker
      ? calcBatsmanStats(striker, inningsBalls, true,
          inningsBalls.find(b => b.is_wicket && b.batsman_id === striker.id))
      : null;
    const nonStrikerStats = nonStriker
      ? calcBatsmanStats(nonStriker, inningsBalls, false,
          inningsBalls.find(b => b.is_wicket && b.batsman_id === nonStriker.id))
      : null;

    const bowlerStats = bowler ? calcBowlerStats(bowler, inningsBalls) : null;
    const overHistory = buildOverHistory(inningsBalls);

    // Current over balls (the incomplete over)
    const currentOverNum = currentInnings ? Math.floor(currentInnings.total_balls / 6) : 0;
    const currentOverBalls = inningsBalls
      .filter(b => b.over_number === currentOverNum)
      .map(ballToSummary);

    const crr = currentInnings
      ? calcCRR(currentInnings.total_runs, currentInnings.total_balls)
      : 0;

    const rrr = currentInnings?.target
      ? calcRRR(currentInnings.target, currentInnings.total_runs, match.overs, currentInnings.total_balls)
      : null;

    const projectedScore = currentInnings
      ? calcProjectedScore(currentInnings.total_runs, currentInnings.total_balls, match.overs)
      : 0;

    // Free hit next ball?
    const isFreehitNext = lastBall?.extra_type === 'noball';

    return {
      match,
      session: { id: '', code: '', name: null, status: 'active', owner_id: null, created_at: '' }, // filled by parent
      teams: { team1: teams.team1!, team2: teams.team2! },
      players,
      currentInnings,
      previousInnings,
      currentBatsmen: [strikerStats, nonStrikerStats],
      currentBowler: bowlerStats,
      partnerships: [],
      overHistory,
      currentOverBalls,
      allBalls: inningsBalls,
      crr,
      rrr,
      projectedScore,
      isFreehitNext,
    };
  }, [match, innings, balls, players, teams]);
}
