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
      <div className="anim-fade-up" style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/tournament_trophy.png" width="28" height="28" style={{ objectFit: 'contain' }} alt="" />
              <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.5px' }}>Rankings</div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Global player leaderboard</div>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: '12px', padding: '4px', marginBottom: '10px', border: '1px solid var(--border)' }}>
          {(['batting','bowling','allrounder'] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: category === c ? 'var(--s3)' : 'transparent', color: category === c ? 'var(--txt)' : 'var(--muted)', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', fontFamily: 'Barlow, sans-serif' }}
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
              className={`pill${period === p ? ' on' : ''}`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skel" style={{ height: '60px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div style={{ background: 'var(--s1)', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <img src="/empty_state_pitch.png" width="80" height="80" style={{ objectFit: 'contain', opacity: 0.7 }} alt="" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>No Rankings Yet</div>
            <div style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '16px' }}>Play matches to appear here</div>
            <button
              onClick={() => router.push('/create')}
              style={{ background: 'var(--live)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Create Match
            </button>
          </div>
        ) : (
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Top 3 podium */}
            {players.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {[players[1], players[0], players[2]].map((p, i) => {
                  const podiumOrder = [2, 1, 3];
                  const heights = ['80px', '100px', '70px'];
                  const colors = ['var(--muted)', 'var(--red)', 'var(--amber)'];
                  return (
                    <div
                      key={p.userId}
                      style={{ background: p.isMe ? 'var(--red-lo)' : 'var(--s1)', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: `1px solid ${p.isMe ? 'var(--red)' : 'var(--border)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: heights[i] }}
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
                style={{ background: p.isMe ? 'var(--red-lo)' : 'var(--s1)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${p.isMe ? 'rgba(227,27,35,.3)' : 'var(--border)'}` }}
              >
                <div style={{ width: '28px', fontSize: '14px', fontWeight: 800, color: 'var(--dim)', textAlign: 'center', flexShrink: 0 }}>
                  {MEDAL[p.rank] || `#${p.rank}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.name}
                    {p.isMe && <span style={{ fontSize: '10px', background: 'var(--live)', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 800 }}>YOU</span>}
                  </div>
                  {p.secondary && <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>{p.secondary}</div>}
                  {p.meta && <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '1px' }}>{p.meta}</div>}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--txt)', flexShrink: 0 }}>{p.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
