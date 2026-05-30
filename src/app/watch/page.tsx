'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/nav/BottomTabBar';
import { createClient } from '@/lib/supabase/client';

export default function WatchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    loadLive();
  }, []);

  const loadLive = async () => {
    // Get all active sessions with their latest innings
    const { data: sessions } = await supabase
      .from('sessions')
      .select(`
        id, code, name, status,
        teams ( id, name ),
        matches ( id, status, overs, team1_id, team2_id,
          innings ( total_runs, total_wickets, total_balls, status, target )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (sessions) {
      const live = sessions.map((s: any) => {
        const match = s.matches?.[0];
        const activeInnings = match?.innings?.find((i: any) => i.status === 'active');
        const team1 = s.teams?.[0];
        const team2 = s.teams?.[1];
        const balls = activeInnings?.total_balls ?? 0;
        const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
        const crr = balls > 0 ? (activeInnings.total_runs / (balls / 6)).toFixed(2) : '0.00';
        return {
          code: s.code,
          name: s.name ?? `${team1?.name ?? 'Team A'} vs ${team2?.name ?? 'Team B'}`,
          team1Name: team1?.name ?? 'Team A',
          team2Name: team2?.name ?? 'Team B',
          runs: activeInnings?.total_runs ?? '--',
          wickets: activeInnings?.total_wickets ?? '--',
          overs,
          crr,
          target: activeInnings?.target ?? null,
          matchStatus: match?.status ?? s.status,
        };
      });
      setLiveMatches(live);
    }
    setLoading(false);
  };

  const handleJoinByCode = () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/match/${trimmed}`);
  };

  return (
    <div className="screen" style={{ background: '#000', color: '#fff', minHeight: '100dvh', overflowY: 'auto', paddingBottom: '80px' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Watch Live</div>
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Spectate any match with a code</div>
      </div>

      {/* Join by code */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter match code"
            maxLength={6}
            style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '15px', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
          />
          <button
            onClick={handleJoinByCode}
            style={{ background: '#e31b23', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            Watch
          </button>
        </div>
      </div>

      {/* Live matches */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', letterSpacing: '1px', marginBottom: '12px' }}>
          LIVE NOW {!loading && `(${liveMatches.length})`}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading…</div>
        ) : liveMatches.length === 0 ? (
          <div style={{ padding: '32px', background: '#111', borderRadius: '16px', textAlign: 'center', color: '#6b7280', fontSize: '13px', border: '1px solid #222' }}>
            No live matches right now
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveMatches.map(m => (
              <div
                key={m.code}
                onClick={() => router.push(`/match/${m.code}`)}
                style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(227,27,35,0.2)', overflow: 'hidden', cursor: 'pointer' }}
              >
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div>
                      <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>LIVE</span>
                      <span style={{ fontSize: '13px', color: '#d1d5db' }}>{m.name}</span>
                    </div>
                    <div style={{ background: '#1c1c1c', color: '#9ca3af', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', letterSpacing: '1px' }}>
                      {m.code}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{m.team1Name}</div>
                      <div style={{ fontSize: '26px', fontWeight: 700 }}>
                        {m.runs}<span style={{ fontSize: '15px', color: '#9ca3af', fontWeight: 'normal' }}>/{m.wickets}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{m.overs} ov · CRR {m.crr}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#4b5563' }}>VS</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{m.team2Name}</div>
                      <div style={{ fontSize: '26px', fontWeight: 700 }}>--</div>
                      {m.target && (
                        <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>Target {m.target}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '10px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                  Tap to watch
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
