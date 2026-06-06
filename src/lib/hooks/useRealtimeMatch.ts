'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Ball, Innings, Match, Player, Team } from '@/types/cricket';

export interface RealtimeMatchData {
  session: any | null;
  match: Match | null;
  innings: Innings[];
  balls: Ball[];
  players: Player[];
  teams: Team[];
  loading: boolean;
  error: string | null;
  pendingSpeeds: number[];
  /** Broadcast live score + ball data to all viewers (scorer calls this per ball) */
  sendScoreUpdate: (inningsId: string, runs: number, wickets: number, balls: number, ball?: any) => void;
  clearPendingSpeeds: () => void;
}

export function useRealtimeMatch(matchCode: string): RealtimeMatchData {
  // Memoize the client in a ref — createClient() must not be called on every render
  // or it will cause the useEffect subscription to teardown/re-subscribe continuously.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [data, setData] = useState<Omit<RealtimeMatchData, 'sendScoreUpdate' | 'clearPendingSpeeds'>>({
    session: null, match: null, innings: [], balls: [], players: [], teams: [], loading: true, error: null, pendingSpeeds: []
  });
  const sessionIdRef = useRef<string>('');
  const matchIdRef = useRef<string>('');

  const fetchInitial = useCallback(async () => {
    const { data: session, error: se } = await supabase
      .from('sessions').select('*').eq('code', matchCode).single();
    if (se || !session) { setData(d => ({ ...d, loading: false, error: 'Session not found' })); return; }

    sessionIdRef.current = session.id;

    const { data: match } = await supabase
      .from('matches').select('*').eq('session_id', session.id)
      .order('match_number', { ascending: false }).limit(1).single();
    if (!match) { setData(d => ({ ...d, session, loading: false, error: 'No active match' })); return; }

    matchIdRef.current = match.id;

    const { data: innings } = await supabase.from('innings').select('*').eq('match_id', match.id);
    const inningsIds = (innings ?? []).map((i: Innings) => i.id);
    const [{ data: balls }, { data: players }, { data: teams }] = await Promise.all([
      inningsIds.length
        ? supabase.from('balls').select('*').in('innings_id', inningsIds).order('created_at', { ascending: true })
        : { data: [] as Ball[] },
      supabase.from('players').select('*').eq('session_id', session.id),
      supabase.from('teams').select('*').eq('session_id', session.id),
    ]);

    setData(prev => ({ ...prev, session, match, innings: innings ?? [], balls: balls ?? [], players: players ?? [], teams: teams ?? [], loading: false, error: null }));
  }, [matchCode]);

  useEffect(() => {
    fetchInitial();

    // Use a stable channel name (no Date.now()) to avoid leaking channels on re-renders.
    // Each unique matchCode gets exactly one Supabase realtime channel.
    const channel = supabase.channel(`match:${matchCode}`)
      // Per-ball score broadcast from scorer — updates innings totals + appends ball for viewers
      .on('broadcast', { event: 'score_update' }, (payload: any) => {
        const { innings_id, runs, wickets, balls, ball } = payload.payload ?? {};
        if (!innings_id) return;
        setData(prev => {
          const nextInnings = prev.innings.map(i =>
            i.id === innings_id
              ? {
                  ...i,
                  total_runs: Math.max(i.total_runs, runs),
                  total_wickets: Math.max(i.total_wickets, wickets),
                  total_balls: Math.max(i.total_balls, balls),
                }
              : i
          );
          // Add the ball to the live feed if it's new (no real id yet — dedup by delivery_number)
          let nextBalls = prev.balls;
          if (ball && ball.innings_id) {
            const alreadyHave = prev.balls.some(
              b => b.innings_id === ball.innings_id &&
                   b.over_number === ball.over_number &&
                   b.delivery_number === ball.delivery_number
            );
            if (!alreadyHave) {
              // Assign a temp id so React keys don't collide; real id arrives via score_tickers
              nextBalls = [...prev.balls, { ...ball, id: ball.id ?? `tmp_${ball.innings_id}_${ball.delivery_number}` }] as Ball[];
            }
          }
          return { ...prev, innings: nextInnings, balls: nextBalls };
        });
      })
      // Listen for ball speed broadcasts from the Speed Cam page (from this device or others)
      .on('broadcast', { event: 'ball_speed' }, (payload: any) => {
        const kmh = payload.payload?.speed_kmh;
        if (typeof kmh === 'number') {
          setData(prev => {
            // Keep last 10 readings max to prevent memory bloat, although it should be cleared per ball
            const updated = [...prev.pendingSpeeds, kmh].slice(-10);
            return { ...prev, pendingSpeeds: updated };
          });
        }
      })
      // Match status changes (pause, result, etc.) — refetch match row only
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          setData(prev => ({
            ...prev,
            match: prev.match?.id === payload.new?.id ? { ...prev.match, ...payload.new } as Match : prev.match,
          }));
        })
      // Match INSERT (new match started) — full refetch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          fetchInitial();
        })
      // Innings UPDATE — update score in-place (instant for all viewers)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'innings' },
        (payload: any) => {
          if (payload.new?.match_id !== matchIdRef.current && matchIdRef.current) return;
          setData(prev => ({
            ...prev,
            innings: prev.innings.map(i => i.id === payload.new?.id ? { ...i, ...payload.new } as Innings : i),
          }));
        })
      // Innings INSERT (new innings) — full refetch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'innings' },
        (payload: any) => {
          if (payload.new?.match_id !== matchIdRef.current && matchIdRef.current) return;
          fetchInitial();
        })
      // Optimized score ticker listener for bulk ball updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'score_tickers' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          const { new_balls, innings_update, reload_balls } = payload.new.data || {};

          if (reload_balls) {
            fetchInitial();
            return;
          }

          setData(prev => {
            let nextState = { ...prev };

            // Handle bulk balls — replace any matching temp balls from live broadcast
            if (new_balls && Array.isArray(new_balls)) {
              const inningsIds = prev.innings.map(i => i.id);
              const validBalls = new_balls.filter((b: any) => inningsIds.includes(b.innings_id));
              if (validBalls.length > 0) {
                // Remove temp balls (no real UUID, keyed by delivery_number) that are now in DB
                const dbKeys = new Set(validBalls.map((b: any) => `${b.innings_id}_${b.delivery_number}`));
                const withoutStale = prev.balls.filter(b =>
                  !String(b.id).startsWith('tmp_') ||
                  !dbKeys.has(`${b.innings_id}_${(b as any).delivery_number}`)
                );
                const existingIds = new Set(withoutStale.map(b => b.id));
                const uniqueNew = validBalls.filter((b: any) => !existingIds.has(b.id));
                if (uniqueNew.length > 0 || withoutStale.length !== prev.balls.length) {
                  nextState.balls = [...withoutStale, ...uniqueNew] as Ball[];
                }
              }
            }

            // Sync innings instantly
            if (innings_update && innings_update.id) {
              nextState.innings = nextState.innings.map(i =>
                i.id === innings_update.id ? { ...i, ...innings_update } as Innings : i
              );
              // Gap detection: if DB says more legal balls than we have, a batch was lost
              // (race condition when two overs submit in quick succession).
              const ourBalls = nextState.balls.filter(b => b.innings_id === innings_update.id).length;
              if (innings_update.total_balls > ourBalls) {
                // Defer fetchInitial outside of setData callback
                setTimeout(() => fetchInitial(), 50);
              }
            }

            return nextState;
          });
        })
      // Players change — only refetch players + teams, NOT full initial load
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },
        async (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          const [{ data: players }, { data: teams }] = await Promise.all([
            supabase.from('players').select('*').eq('session_id', sessionIdRef.current),
            supabase.from('teams').select('*').eq('session_id', sessionIdRef.current),
          ]);
          setData(prev => ({ ...prev, players: players ?? prev.players, teams: teams ?? prev.teams }));
        })
      .subscribe((status: string) => {
        // Resync when connection is (re)established — catches events missed while subscribing
        if (status === 'SUBSCRIBED') fetchInitial();
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [matchCode, fetchInitial]);

  const sendScoreUpdate = useCallback((inningsId: string, runs: number, wickets: number, balls: number, ball?: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'score_update',
      payload: { innings_id: inningsId, runs, wickets, balls, ball },
    });
  }, []);

  const clearPendingSpeeds = useCallback(() => {
    setData(prev => ({ ...prev, pendingSpeeds: [] }));
  }, []);

  return { ...data, sendScoreUpdate, clearPendingSpeeds };
}
