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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Split state for granular updates ──────────────────────────
  const [session, setSession] = useState<any | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [innings, setInnings] = useState<Innings[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSpeeds, setPendingSpeeds] = useState<number[]>([]);

  const sessionIdRef = useRef<string>('');
  const matchIdRef = useRef<string>('');
  const hasSubscribedRef = useRef(false);
  // Stale-fetch guard: increment before each fetch, discard results if generation changed
  const fetchGenRef = useRef(0);

  const fetchInitial = useCallback(async () => {
    const gen = ++fetchGenRef.current;

    const { data: sess, error: se } = await supabase
      .from('sessions').select('*').eq('code', matchCode).single();
    if (se || !sess) { setLoading(false); setError('Session not found'); return; }

    sessionIdRef.current = sess.id;

    const { data: m } = await supabase
      .from('matches').select('*').eq('session_id', sess.id)
      .order('match_number', { ascending: false }).limit(1).single();
    if (!m) {
      if (gen !== fetchGenRef.current) return;
      setSession(sess); setLoading(false); setError('No active match'); return;
    }

    matchIdRef.current = m.id;

    const { data: inn } = await supabase.from('innings').select('*').eq('match_id', m.id);
    const inningsIds = (inn ?? []).map((i: Innings) => i.id);
    const [{ data: b }, { data: p }, { data: t }] = await Promise.all([
      inningsIds.length
        ? supabase.from('balls').select('*').in('innings_id', inningsIds).order('delivery_number', { ascending: true })
        : { data: [] as Ball[] },
      supabase.from('players').select('*').eq('session_id', sess.id),
      supabase.from('teams').select('*').eq('session_id', sess.id),
    ]);

    // Discard if a newer fetchInitial call completed while we were awaiting
    if (gen !== fetchGenRef.current) return;

    setSession(sess);
    setMatch(m);
    setInnings(inn ?? []);
    setBalls(b ?? []);
    setPlayers(p ?? []);
    setTeams(t ?? []);
    setLoading(false);
    setError(null);
  }, [matchCode]);

  useEffect(() => {
    // fetchInitial is called in the SUBSCRIBED callback below — no need to call it here too.
    // Calling it here AND on SUBSCRIBED causes two parallel fetches on every mount.
    const channel = supabase.channel(`match:${matchCode}`)
      // Per-ball score broadcast from scorer — updates innings totals + appends ball for viewers
      .on('broadcast', { event: 'score_update' }, (payload: any) => {
        const { innings_id, runs, wickets, balls: totalBalls, ball } = payload.payload ?? {};
        if (!innings_id) return;

        setInnings(prev => prev.map(i =>
          i.id === innings_id
            ? {
                ...i,
                total_runs: Math.max(i.total_runs, runs),
                total_wickets: Math.max(i.total_wickets, wickets),
                total_balls: Math.max(i.total_balls, totalBalls),
              }
            : i
        ));

        // Add the ball to the live feed if it's new (dedup by delivery_number)
        if (ball && ball.innings_id) {
          setBalls(prev => {
            const alreadyHave = prev.some(
              b => b.innings_id === ball.innings_id &&
                   b.over_number === ball.over_number &&
                   b.delivery_number === ball.delivery_number
            );
            if (alreadyHave) return prev;
            // Assign a temp id so React keys don't collide; real id arrives via score_tickers
            return [...prev, { ...ball, id: ball.id ?? `tmp_${ball.innings_id}_${ball.delivery_number}` }] as Ball[];
          });
        }
      })
      // Listen for ball speed broadcasts from the Speed Cam page
      .on('broadcast', { event: 'ball_speed' }, (payload: any) => {
        const kmh = payload.payload?.speed_kmh;
        if (typeof kmh === 'number') {
          setPendingSpeeds(prev => [...prev, kmh].slice(-10));
        }
      })
      // Match status changes — update match in-place.
      // On innings_2 transition, full refetch to load the new innings row (may have been missed if
      // the innings INSERT arrived before sessionIdRef was populated on the first subscribe).
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          if (payload.new?.status === 'innings_2') {
            fetchInitial();
            return;
          }
          setMatch(prev => prev?.id === payload.new?.id ? { ...prev, ...payload.new } as Match : prev);
        })
      // Match INSERT (new match started) — full refetch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          fetchInitial();
        })
      // Innings UPDATE — update score in-place
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'innings' },
        (payload: any) => {
          if (payload.new?.match_id !== matchIdRef.current && matchIdRef.current) return;
          setInnings(prev => prev.map(i => i.id === payload.new?.id ? { ...i, ...payload.new } as Innings : i));
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

          // Handle bulk balls — replace any matching temp balls from live broadcast
          if (new_balls && Array.isArray(new_balls)) {
            setBalls(prev => {
              const currentInningsIds = new Set<string>();
              // We need to know valid innings IDs — get from the balls + new_balls themselves
              prev.forEach(b => currentInningsIds.add(b.innings_id));
              new_balls.forEach((b: any) => currentInningsIds.add(b.innings_id));

              const validBalls = new_balls.filter((b: any) => currentInningsIds.has(b.innings_id));
              if (validBalls.length === 0) return prev;

              // Remove temp balls that are now in DB
              const dbKeys = new Set(validBalls.map((b: any) => `${b.innings_id}_${b.delivery_number}`));
              const withoutStale = prev.filter(b =>
                !String(b.id).startsWith('tmp_') ||
                !dbKeys.has(`${b.innings_id}_${(b as any).delivery_number}`)
              );
              const existingIds = new Set(withoutStale.map(b => b.id));
              const uniqueNew = validBalls.filter((b: any) => !existingIds.has(b.id));
              if (uniqueNew.length > 0 || withoutStale.length !== prev.length) {
                return [...withoutStale, ...uniqueNew] as Ball[];
              }
              return prev;
            });
          }

          // Sync innings instantly
          if (innings_update && innings_update.id) {
            setInnings(prev => prev.map(i =>
              i.id === innings_update.id ? { ...i, ...innings_update } as Innings : i
            ));
            // Gap detection: compare legal balls in DB vs legal balls on client
            // (total_balls only counts legal deliveries, so we must count the same way)
            setBalls(prev => {
              const legalOurs = prev.filter(
                b => b.innings_id === innings_update.id &&
                     b.extra_type !== 'wide' && b.extra_type !== 'noball'
              ).length;
              if (innings_update.total_balls > legalOurs) {
                // Schedule outside the updater to avoid StrictMode double-invocation
                Promise.resolve().then(() => fetchInitial());
              }
              return prev;
            });
          }
        })
      // Players change — only refetch players + teams
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },
        async (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          const [{ data: p }, { data: t }] = await Promise.all([
            supabase.from('players').select('*').eq('session_id', sessionIdRef.current),
            supabase.from('teams').select('*').eq('session_id', sessionIdRef.current),
          ]);
          if (p) setPlayers(p);
          if (t) setTeams(t);
        })
      .subscribe((status: string) => {
        // Only full-refetch on the very first SUBSCRIBED, not on reconnects.
        // Reconnects replay missed postgres_changes events automatically.
        if (status === 'SUBSCRIBED' && !hasSubscribedRef.current) {
          hasSubscribedRef.current = true;
          fetchInitial();
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      hasSubscribedRef.current = false;
      fetchGenRef.current++; // invalidate any in-flight fetchInitial
    };
  }, [matchCode, fetchInitial]);

  const sendScoreUpdate = useCallback((inningsId: string, runs: number, wickets: number, totalBalls: number, ball?: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'score_update',
      payload: { innings_id: inningsId, runs, wickets, balls: totalBalls, ball },
    });
  }, []);

  const clearPendingSpeeds = useCallback(() => {
    setPendingSpeeds([]);
  }, []);

  return { session, match, innings, balls, players, teams, loading, error, pendingSpeeds, sendScoreUpdate, clearPendingSpeeds };
}
