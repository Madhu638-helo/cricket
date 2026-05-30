'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/nav/BottomTabBar';

type Category = 'batting' | 'bowling' | 'allrounder';
type Period = 'weekly' | 'monthly' | 'yearly' | 'alltime';

interface RankedPlayer {
  rank: number;
  name: string;
  value: string;
  secondary?: string;
  meta?: string;
  userId?: string;
  isMe?: boolean;
}

const MEDAL = ['', '🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('batting');
  const [period, setPeriod] = useState<Period>('alltime');
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?category=${category}&period=${period}`)
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then(d => { if (d) setPlayers(d.rankings ?? []); })
      .finally(() => setLoading(false));
  }, [category, period]);

  const periodLabels: Record<Period, string> = {
    weekly: 'Week', monthly: 'Month', yearly: 'Year', alltime: 'All Time',
  };

  return (
    <div id="s-leaderboard" className="screen" style={{ paddingBottom: '80px', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>Rankings</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Global player leaderboard</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(227,27,35,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e31b23" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', background: '#111', borderRadius: '12px', padding: '4px', marginBottom: '10px' }}>
          {(['batting','bowling','allrounder'] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: category === c ? '#1f1f1f' : 'transparent', color: category === c ? '#fff' : '#6b7280', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}
            >
              {c === 'allrounder' ? 'All-Round' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['weekly','monthly','yearly','alltime'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{ background: period === p ? '#e31b23' : 'rgba(255,255,255,.07)', color: period === p ? '#fff' : '#9ca3af', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>Loading rankings…</div>
        ) : players.length === 0 ? (
          <div style={{ background: '#111', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: '#9ca3af' }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
                <path strokeLinecap="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>No Rankings Yet</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Play matches to appear here</div>
            <button
              onClick={() => router.push('/create')}
              style={{ background: '#e31b23', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Create Match
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Top 3 podium */}
            {players.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {[players[1], players[0], players[2]].map((p, i) => {
                  const podiumOrder = [2, 1, 3];
                  const heights = ['80px', '100px', '70px'];
                  const colors = ['#9ca3af', '#e31b23', '#d97706'];
                  return (
                    <div
                      key={p.userId}
                      style={{ background: p.isMe ? 'rgba(227,27,35,.15)' : '#111', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: `1px solid ${p.isMe ? '#e31b23' : '#1f1f1f'}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: heights[i] }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 800, color: colors[i], marginBottom: '4px' }}>#{podiumOrder[i]}</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: colors[i] }}>{p.value}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rest of list */}
            {players.slice(3).map(p => (
              <div
                key={p.userId}
                style={{ background: p.isMe ? 'rgba(227,27,35,.1)' : '#111', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${p.isMe ? 'rgba(227,27,35,.3)' : '#1f1f1f'}` }}
              >
                <div style={{ width: '28px', fontSize: '14px', fontWeight: 800, color: '#6b7280', textAlign: 'center', flexShrink: 0 }}>
                  {MEDAL[p.rank] || `#${p.rank}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.name}
                    {p.isMe && <span style={{ fontSize: '10px', background: '#e31b23', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 800 }}>YOU</span>}
                  </div>
                  {p.secondary && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{p.secondary}</div>}
                  {p.meta && <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '1px' }}>{p.meta}</div>}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{p.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
