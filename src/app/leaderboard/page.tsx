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

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#f97316,#ea580c)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  'linear-gradient(135deg,#22c55e,#16a34a)',
  'linear-gradient(135deg,#0a84ff,#0061d1)',
  'linear-gradient(135deg,#f43f5e,#e11d48)',
  'linear-gradient(135deg,#eab308,#ca8a04)',
];

const CrownIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
    <path d="M3 18h18M3 18l2-8 4.5 4L12 6l2.5 8L19 10l2 8H3z" />
  </svg>
);

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
  }, [category, period, router]);

  const periodLabels: Record<Period, string> = {
    weekly: 'Week', monthly: 'Month', yearly: 'Year', alltime: 'All Time',
  };

  const categoryConfig: Record<Category, { label: string; icon: React.ReactNode }> = {
    batting:    { label: 'Batting',   icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg> },
    bowling:    { label: 'Bowling',   icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg> },
    allrounder: { label: 'All-Round', icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
  };

  return (
    <div id="s-leaderboard" className="screen" style={{ paddingBottom: '80px', overflowY: 'auto' }}>

      {/* Header */}
      <div className="anim-fade-up" style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <img src="/tournament_trophy.png" width="28" height="28" style={{ objectFit: 'contain' }} alt="" />
          <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.5px' }}>Rankings</div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', fontFamily: 'Barlow, sans-serif' }}>Global player leaderboard</div>

        {/* Category tabs */}
        <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: '12px', padding: '4px', marginBottom: '10px', border: '1px solid var(--border)', gap: '2px' }}>
          {(Object.entries(categoryConfig) as [Category, typeof categoryConfig[Category]][]).map(([c, cfg]) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: '9px',
                  background: active ? 'var(--live)' : 'transparent',
                  color: active ? '#fff' : 'var(--muted)',
                  border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all .15s', fontFamily: 'Barlow, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  boxShadow: active ? '0 2px 8px rgba(249,115,22,.35)' : 'none',
                }}
                aria-pressed={active}
              >
                {cfg.icon}{cfg.label}
              </button>
            );
          })}
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
              <div key={i} className="skel" style={{ height: '64px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div style={{ background: 'var(--s1)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <img src="/empty_state_pitch.png" width="80" height="80" style={{ objectFit: 'contain', opacity: 0.7 }} alt="" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: '8px', fontFamily: 'Barlow, sans-serif' }}>No Rankings Yet</div>
            <div style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '16px', fontFamily: 'Barlow, sans-serif' }}>Play matches to appear here</div>
            <button
              onClick={() => router.push('/create')}
              style={{ background: 'var(--live)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}
            >
              Create Match
            </button>
          </div>
        ) : (
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* ── Top 3 podium ── */}
            {players.length >= 3 && (
              <div style={{ marginBottom: '4px' }}>
                {/* Podium visual — Silver, Gold, Bronze order */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'flex-end' }}>
                  {/* #2 — Silver, paddingTop gives height stagger without overflow */}
                  <PodiumCard player={players[1]} rank={2} topPad={28} colorGrad="linear-gradient(180deg,rgba(160,174,192,.18),rgba(160,174,192,.04))" borderColor="rgba(160,174,192,.3)" rankColor="#a0aec0" avatarColor={AVATAR_COLORS[1]} delay="d2" />
                  {/* #1 — Gold */}
                  <PodiumCard player={players[0]} rank={1} topPad={4} colorGrad="linear-gradient(180deg,rgba(251,191,36,.18),rgba(251,191,36,.04))" borderColor="rgba(251,191,36,.4)" rankColor="#fbbf24" avatarColor={AVATAR_COLORS[0]} delay="d1" crown />
                  {/* #3 — Bronze */}
                  <PodiumCard player={players[2]} rank={3} topPad={44} colorGrad="linear-gradient(180deg,rgba(180,83,9,.18),rgba(180,83,9,.04))" borderColor="rgba(180,83,9,.3)" rankColor="#b45309" avatarColor={AVATAR_COLORS[4]} delay="d3" />
                </div>
              </div>
            )}

            {/* Rest of list */}
            {players.slice(3).map((p, idx) => (
              <div
                key={p.userId}
                className={`anim-fade-up d${Math.min(idx + 1, 6)}`}
                style={{
                  background: p.isMe ? 'var(--red-lo)' : 'var(--s1)',
                  borderRadius: '12px', padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  border: `1px solid ${p.isMe ? 'rgba(227,27,35,.3)' : 'var(--border)'}`,
                  transition: 'background .15s',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '32px', textAlign: 'center', flexShrink: 0,
                  fontSize: '13px', fontWeight: 800,
                  color: 'var(--dim)', fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                  #{p.rank}
                </div>
                {/* Avatar */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: AVATAR_COLORS[(p.rank - 1) % AVATAR_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 900, color: '#fff',
                  fontFamily: 'Barlow Condensed, sans-serif', flexShrink: 0,
                }}>
                  {initials(p.name)}
                </div>
                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                    {p.isMe && <span style={{ fontSize: '9px', background: 'var(--live)', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, flexShrink: 0 }}>YOU</span>}
                  </div>
                  {p.secondary && <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '1px', fontFamily: 'Barlow, sans-serif' }}>{p.secondary}</div>}
                </div>
                {/* Value */}
                <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--txt)', flexShrink: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>{p.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

function PodiumCard({ player, rank, topPad, colorGrad, borderColor, rankColor, avatarColor, delay, crown }: {
  player: RankedPlayer; rank: number; topPad: number;
  colorGrad: string; borderColor: string; rankColor: string; avatarColor: string;
  delay: string; crown?: boolean;
}) {
  return (
    <div
      className={`anim-scale-up ${delay}`}
      style={{
        background: player.isMe ? 'var(--red-lo)' : colorGrad,
        borderRadius: '14px',
        border: `1px solid ${player.isMe ? 'rgba(227,27,35,.4)' : borderColor}`,
        padding: `${topPad + 14}px 8px 12px`,
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        gap: '6px',
        position: 'relative',
      }}
    >
      {/* Crown for #1 */}
      {crown && (
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', fontSize: '18px', lineHeight: 1 }}>
          <CrownIcon />
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: crown ? '46px' : '38px',
        height: crown ? '46px' : '38px',
        borderRadius: '50%',
        background: avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: crown ? '14px' : '12px', fontWeight: 900, color: '#fff',
        fontFamily: 'Barlow Condensed, sans-serif',
        border: `2px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        {initials(player.name)}
      </div>

      {/* Name */}
      <div style={{
        fontSize: '11px', fontWeight: 700, fontFamily: 'Barlow, sans-serif',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%', color: 'var(--txt)',
        padding: '0 4px',
      }}>{player.name}</div>

      {/* Value */}
      <div style={{
        fontSize: crown ? '18px' : '15px', fontWeight: 900,
        color: rankColor, fontFamily: 'Barlow Condensed, sans-serif',
        lineHeight: 1,
      }}>{player.value}</div>

      {/* Rank pill */}
      <div style={{
        fontSize: '10px', fontWeight: 800, color: rankColor,
        background: `${borderColor.replace('rgba', 'rgba').replace(/,\s*[\d.]+\)/, ', .12)')}`,
        borderRadius: '6px', padding: '2px 8px',
        fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.3px',
      }}>#{rank}</div>
    </div>
  );
}
