'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Ball, Innings, Match, Player } from '@/types/cricket';

export interface RealtimeMatchData {
  session: any | null;
  match: Match | null;
  innings: Innings[];
  balls: Ball[];
  players: Player[];
  loading: boolean;
  error: string | null;
}

export function useRealtimeMatch(matchCode: string): RealtimeMatchData {
  const supabase = createClient();
  const [data, setData] = useState<RealtimeMatchData>({
    session: null, match: null, innings: [], balls: [], players: [], loading: true, error: null,
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
    const { data: balls } = inningsIds.length
      ? await supabase.from('balls').select('*').in('innings_id', inningsIds).order('created_at', { ascending: true })
      : { data: [] };
    const { data: players } = await supabase.from('players').select('*').eq('session_id', session.id);

    setData({ session, match, innings: innings ?? [], balls: balls ?? [], players: players ?? [], loading: false, error: null });
  }, [matchCode, supabase]);

  useEffect(() => {
    fetchInitial();

    const channel = supabase.channel(`match:${matchCode}`)
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
      // Balls INSERT — append directly (no refetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls' },
        (payload: any) => {
          setData(prev => {
            const inningsIds = prev.innings.map(i => i.id);
            if (!inningsIds.includes(payload.new?.innings_id)) return prev;
            // Deduplicate — scorer's own pending balls come from local state
            const already = prev.balls.some(b => b.id === payload.new?.id);
            if (already) return prev;
            return { ...prev, balls: [...prev.balls, payload.new as Ball] };
          });
        })
      // Players change
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },
        (payload: any) => {
          if (payload.new?.session_id !== sessionIdRef.current && sessionIdRef.current) return;
          fetchInitial();
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchCode, fetchInitial, supabase]);

  return data;
}
