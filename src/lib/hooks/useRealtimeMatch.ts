'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Ball, Innings, Match, Player } from '@/types/cricket';

export interface RealtimeMatchData {
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
    match: null, innings: [], balls: [], players: [], loading: true, error: null,
  });

  const fetchInitial = useCallback(async () => {
    // Fetch session by code
    const { data: session, error: se } = await supabase
      .from('sessions').select('*').eq('code', matchCode).single();
    if (se || !session) { setData(d => ({ ...d, loading: false, error: 'Session not found' })); return; }

    // Fetch active match
    const { data: match } = await supabase
      .from('matches').select('*').eq('session_id', session.id)
      .order('match_number', { ascending: false }).limit(1).single();
    if (!match) { setData(d => ({ ...d, loading: false, error: 'No active match' })); return; }

    // Fetch all innings for this match
    const { data: innings } = await supabase.from('innings').select('*').eq('match_id', match.id);

    // Fetch balls for all innings
    const inningsIds = (innings ?? []).map((i: Innings) => i.id);
    const { data: balls } = inningsIds.length
      ? await supabase.from('balls').select('*').in('innings_id', inningsIds).order('created_at', { ascending: true })
      : { data: [] };

    // Fetch players
    const { data: players } = await supabase.from('players').select('*').eq('session_id', session.id);

    setData({ match, innings: innings ?? [], balls: balls ?? [], players: players ?? [], loading: false, error: null });
  }, [matchCode, supabase]);

  useEffect(() => {
    fetchInitial();

    const channel = supabase.channel(`match:${matchCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchInitial())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' }, () => fetchInitial())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls' }, (payload: any) => {
        setData(prev => ({ ...prev, balls: [...prev.balls, payload.new as Ball] }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchInitial())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchCode, fetchInitial, supabase]);

  return data;
}
