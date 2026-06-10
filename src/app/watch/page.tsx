'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/nav/BottomTabBar';
import { createClient } from '@/lib/supabase/client';

function abbr(name: string) {
  if (!name) return '???';
  const w = name.trim().split(/\s+/);
  return w.length === 1 ? name.slice(0, 3).toUpperCase() : w.map(x => x[0]).join('').toUpperCase().slice(0, 4);
}

export default function WatchPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');

  const loadLive = useCallback(async () => {
    const { data: sessions } = await supabase
      .from('sessions')
      .select(`
        id, code, name, status,
        teams ( id, name ),
        matches ( id, status, overs, team1_id, team2_id,
          innings ( total_runs, total_wickets, total_balls, status, target, team_id )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (sessions) {
      const live = sessions.map((s: any) => {
        const match = s.matches?.[0];
        const activeInnings = match?.innings?.find((i: any) => i.status === 'active');
        const completedInnings = match?.innings?.find((i: any) => i.status === 'complete');

        const battingTeamId = activeInnings?.team_id;
        const battingTeam = s.teams?.find((t: any) => t.id === battingTeamId);
        const bowlingTeam = s.teams?.find((t: any) => t.id !== battingTeamId);

        const balls = activeInnings?.total_balls ?? 0;
        const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
        const crr = balls > 0 ? ((activeInnings?.total_runs ?? 0) / (balls / 6)).toFixed(2) : '0.00';

        const target = activeInnings?.target ?? null;
        const need = target ? Math.max(0, target - (activeInnings?.total_runs ?? 0)) : null;

        return {
          code: s.code,
          name: s.name ?? `${s.teams?.[0]?.name ?? 'Team A'} vs ${s.teams?.[1]?.name ?? 'Team B'}`,
          battingTeamName: battingTeam?.name ?? s.teams?.[0]?.name ?? 'Batting',
          bowlingTeamName: bowlingTeam?.name ?? s.teams?.[1]?.name ?? 'Bowling',
          runs: activeInnings?.total_runs ?? '--',
          wickets: activeInnings?.total_wickets ?? '--',
          overs,
          crr,
          target,
          need,
          prevScore: completedInnings ? `${completedInnings.total_runs}/${completedInnings.total_wickets}` : null,
          matchStatus: match?.status ?? s.status,
        };
      });
      setLiveMatches(live);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadLive();

    // Realtime: reload whenever any match or innings changes
    const channel = supabase.channel('watch:live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadLive())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' }, () => loadLive())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadLive, supabase]);

  const handleJoinByCode = () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/match/${trimmed}`);
  };

  return (
    <div className="screen" style={{ background: 'var(--bg)', color: 'var(--txt)', minHeight: '100dvh', overflowY: 'auto', paddingBottom: '80px' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px', fontFamily: 'Barlow Condensed, sans-serif' }}>Watch Live</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>Spectate any match with a code</div>
      </div>

      {/* Join by code */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter match code"
            maxLength={6}
            style={{ flex: 1, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--txt)', fontSize: '15px', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', outline: 'none', fontFamily: 'Barlow Condensed, sans-serif' }}
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
          />
          <button
            onClick={handleJoinByCode}
            style={{ background: 'var(--live)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
          >
            Watch
          </button>
        </div>
      </div>

      {/* Live matches */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
          <span className="ldot" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--live)', letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif' }}>
            LIVE NOW {!loading && `(${liveMatches.length})`}
          </span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>Loading…</div>
        ) : liveMatches.length === 0 ? (
          <div style={{ padding: '40px 20px', background: 'var(--s1)', borderRadius: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', border: '1px solid var(--border)', fontFamily: 'Barlow, sans-serif' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏏</div>
            No live matches right now
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveMatches.map(m => (
              <div
                key={m.code}
                onClick={() => router.push(`/match/${m.code}`)}
                style={{ background: 'var(--s1)', borderRadius: '14px', border: '1px solid rgba(249,115,22,.2)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 0 20px rgba(249,115,22,.06)' }}
              >
                {/* Card header */}
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="ldot" />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--live)', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>LIVE</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>· {m.name}</span>
                  </div>
                  <span style={{ background: 'var(--s2)', color: 'var(--dim)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', letterSpacing: '1px', fontFamily: 'Barlow Condensed, sans-serif', border: '1px solid var(--border)' }}>
                    {m.code}
                  </span>
                </div>

                {/* Scores */}
                <div style={{ padding: '14px' }}>
                  {/* Batting team */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--live)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: '#fff', flexShrink: 0 }}>
                        {abbr(m.battingTeamName)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.battingTeamName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0, marginLeft: '8px' }}>
                      <span style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1 }}>{m.runs}</span>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>/{m.wickets}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginLeft: '4px' }}>({m.overs})</span>
                    </div>
                  </div>

                  {/* Bowling team */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--muted)', flexShrink: 0 }}>
                        {abbr(m.bowlingTeamName)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.bowlingTeamName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {m.prevScore && (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>{m.prevScore}</span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                        CRR <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px' }}>{m.crr}</span>
                      </span>
                    </div>
                  </div>

                  {/* Situation */}
                  {m.need !== null && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#fca5a5', fontWeight: 700, fontFamily: 'Barlow, sans-serif', background: 'rgba(248,113,113,.06)', padding: '6px 10px', borderRadius: '8px', textAlign: 'center' }}>
                      🎯 Need {m.need} runs to win
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--s2)', padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 600 }}>
                  Tap to watch →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
