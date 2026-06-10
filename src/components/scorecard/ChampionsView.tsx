'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChampionsViewProps { code: string; }

interface TeamStat {
  name: string;
  wins: number;
  sessions: number;
}

interface SessionStat {
  sessionName: string;
  champion: string | null;
  wins: number;
  totalMatches: number;
}

export default function ChampionsView({ code }: ChampionsViewProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [allTime, setAllTime] = useState<TeamStat[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionStat[]>([]);
  const [currentChampion, setCurrentChampion] = useState<{ name: string; wins: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Load all sessions' completed matches to build all-time standings
    const { data: sessions } = await supabase.from('sessions').select('id, name, code, created_at').order('created_at', { ascending: false });
    const { data: allMatches } = await supabase.from('matches').select('id, session_id, winner_id, status').eq('status', 'result').not('winner_id', 'is', null);
    const { data: allTeams } = await supabase.from('teams').select('id, session_id, name');

    if (!sessions || !allTeams) { setLoading(false); return; }

    // Build teamId → name map
    const teamMap = new Map<string, { name: string; sessionId: string }>(
      (allTeams ?? []).map((t: any) => [t.id, { name: t.name, sessionId: t.session_id }])
    );

    // All-time wins by team name (case-insensitive key)
    const winsByName = new Map<string, TeamStat>();
    const sessionIdSet = new Set<string>();

    (allMatches ?? []).forEach((m: any) => {
      const team = teamMap.get(m.winner_id);
      if (!team) return;
      const key = team.name.trim().toLowerCase();
      const existing = winsByName.get(key);
      if (existing) {
        existing.wins++;
        if (!sessionIdSet.has(`${key}:${m.session_id}`)) {
          existing.sessions++;
          sessionIdSet.add(`${key}:${m.session_id}`);
        }
      } else {
        winsByName.set(key, { name: team.name, wins: 1, sessions: 1 });
        sessionIdSet.add(`${key}:${m.session_id}`);
      }
    });

    const sorted = Array.from(winsByName.values()).sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
    setAllTime(sorted);

    // Per-session champion history
    const sessionStats: SessionStat[] = (sessions ?? []).slice(0, 10).map((s: any) => {
      const sessionMatches = (allMatches ?? []).filter((m: any) => m.session_id === s.id);
      const sessionTeams = (allTeams ?? []).filter((t: any) => t.session_id === s.id);

      const winCount = new Map<string, number>();
      sessionMatches.forEach((m: any) => {
        winCount.set(m.winner_id, (winCount.get(m.winner_id) ?? 0) + 1);
      });

      let champId: string | null = null;
      let champWins = 0;
      winCount.forEach((w, id) => {
        if (w > champWins) { champWins = w; champId = id; }
      });

      // Only declare champion if strictly ahead
      const sorted = Array.from(winCount.entries()).sort((a, b) => b[1] - a[1]);
      const isUnique = sorted.length === 1 || (sorted.length > 1 && sorted[0][1] > sorted[1][1]);
      const champion = isUnique && champId ? (teamMap.get(champId)?.name ?? null) : null;

      return {
        sessionName: s.name ?? s.code,
        champion,
        wins: champWins,
        totalMatches: sessionMatches.length,
      };
    }).filter((s: SessionStat) => s.totalMatches > 0);

    setSessionHistory(sessionStats);

    // Current session champion
    const { data: currentSession } = await supabase.from('sessions').select('id').eq('code', code).single();
    if (currentSession) {
      const currentMatches = (allMatches ?? []).filter((m: any) => m.session_id === currentSession.id);
      const currentWinCount = new Map<string, number>();
      currentMatches.forEach((m: any) => {
        currentWinCount.set(m.winner_id, (currentWinCount.get(m.winner_id) ?? 0) + 1);
      });
      const currentSorted = Array.from(currentWinCount.entries()).sort((a, b) => b[1] - a[1]);
      if (currentSorted.length > 0 && (currentSorted.length === 1 || currentSorted[0][1] > currentSorted[1][1])) {
        const name = teamMap.get(currentSorted[0][0])?.name ?? null;
        if (name) setCurrentChampion({ name, wins: currentSorted[0][1] });
      }
    }

    setLoading(false);
  }, [code, supabase]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`champions:${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: any) => { if (payload.new?.status === 'result') load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase, code]);

  if (loading) return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
      Loading champions…
    </div>
  );

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Current session champion */}
      {currentChampion ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(250,204,21,.15), rgba(234,179,8,.06))',
          border: '1px solid rgba(250,204,21,.4)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '8px' }}>🏆</div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Barlow, sans-serif', marginBottom: '4px' }}>Current Session Leader</div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--txt)', marginBottom: '4px' }}>{currentChampion.name}</div>
          <div style={{ fontSize: '13px', color: '#fbbf24', fontFamily: 'Barlow, sans-serif', fontWeight: 700 }}>{currentChampion.wins} win{currentChampion.wins !== 1 ? 's' : ''} this session</div>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', fontFamily: 'Barlow, sans-serif' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          No clear session leader yet
        </div>
      )}

      {/* All-time leaderboard */}
      {allTime.length > 0 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', background: '#fbbf24', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>All-Time Wins</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {allTime.slice(0, 10).map((t, i) => (
              <div key={t.name} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: i === 0 ? 'rgba(250,204,21,.04)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{medals[i] ?? `${i + 1}.`}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', color: 'var(--txt)' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>{t.sessions} session{t.sessions !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: i === 0 ? '#fbbf24' : 'var(--txt)' }}>{t.wins}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>wins</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session champion history */}
      {sessionHistory.length > 0 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Session Champions</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {sessionHistory.map((s, i) => (
              <div key={i} style={{
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)', fontFamily: 'Barlow, sans-serif' }}>{s.sessionName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>{s.totalMatches} match{s.totalMatches !== 1 ? 'es' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {s.champion ? (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', color: '#fbbf24' }}>🏆 {s.champion}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>{s.wins}W</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>Tied</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allTime.length === 0 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', fontFamily: 'Barlow, sans-serif' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          No completed matches yet — win some games to appear here!
        </div>
      )}
    </div>
  );
}
