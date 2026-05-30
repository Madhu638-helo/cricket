'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import BottomNavigation from '@/components/nav/BottomTabBar';

const BATTING_STYLES = [
  { value: 'right_hand', label: 'Right-handed Batsman' },
  { value: 'left_hand',  label: 'Left-handed Batsman' },
];
const BOWLING_STYLES = [
  { value: 'none',                   label: 'Does not bowl' },
  { value: 'right_arm_fast',         label: 'Right Arm Fast' },
  { value: 'right_arm_medium_fast',  label: 'Right Arm Medium Fast' },
  { value: 'right_arm_medium',       label: 'Right Arm Medium' },
  { value: 'right_arm_off_spin',     label: 'Right Arm Off Spin' },
  { value: 'right_arm_leg_spin',     label: 'Right Arm Leg Spin' },
  { value: 'left_arm_fast',          label: 'Left Arm Fast' },
  { value: 'left_arm_medium_fast',   label: 'Left Arm Medium Fast' },
  { value: 'left_arm_medium',        label: 'Left Arm Medium' },
  { value: 'left_arm_orthodox',      label: 'Left Arm Orthodox Spin' },
  { value: 'left_arm_wrist_spin',    label: 'Left Arm Wrist Spin' },
];
const PLAYER_ROLES = [
  { value: 'batsman',              label: 'Batsman' },
  { value: 'bowler',               label: 'Bowler' },
  { value: 'allrounder',           label: 'All-rounder' },
  { value: 'wicketkeeper_batsman', label: 'Wicketkeeper-Batsman' },
];
const BATTING_POSITIONS = [
  { value: 'opener',       label: 'Opener' },
  { value: 'top_order',    label: 'Top Order (3-4)' },
  { value: 'middle_order', label: 'Middle Order (5-6)' },
  { value: 'lower_order',  label: 'Lower Order (7-8)' },
  { value: 'tail_ender',   label: 'Tail Ender (9-11)' },
];

const BADGES = [
  { id: 'fifty',     label: '50+',       desc: 'Half century',          color: '#f59e0b', condition: (s: any) => s?.batting?.fifties > 0 },
  { id: 'century',   label: '100',       desc: 'Century',               color: '#e31b23', condition: (s: any) => s?.batting?.hundreds > 0 },
  { id: 'fivefer',   label: '5W',        desc: '5-wicket haul',         color: '#8b5cf6', condition: (s: any) => s?.bowling?.five_wkt_hauls > 0 },
  { id: 'fielder',   label: 'CT',        desc: '10+ career catches',    color: '#22c55e', condition: (s: any) => s?.fielding?.catches >= 10 },
];

interface ProfileData {
  user: any;
  batting: any;
  bowling: any;
  fielding: any;
  recentMatches: any[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding'>('batting');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/login'); return; }
        setData(d);
      })
      .catch(() => router.push('/login'));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!data) return (
    <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Loading…</p>
    </div>
  );

  const { user, batting, bowling, fielding, recentMatches } = data;
  const earnedBadges = BADGES.filter(b => b.condition(data));
  const label = (arr: {value:string;label:string}[], val: string) =>
    arr.find(x => x.value === val)?.label ?? val;

  return (
    <div id="s-profile" className="screen" style={{ paddingBottom: '80px', overflowY: 'auto' }}>

      {/* Header gradient */}
      <div style={{ background: 'linear-gradient(180deg,rgba(227,27,35,.12),transparent)', padding: '20px 20px 0' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>Profile</div>

          {/* Three-dot menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Profile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--muted)">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: 'var(--s2)', border: '1px solid var(--border2)', borderRadius: '12px',
                overflow: 'hidden', minWidth: '160px', zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,.6)',
              }}>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/profile/edit'); }}
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                    color: 'var(--txt)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  style={{
                    width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                    color: '#f87171', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={user?.name ?? 'P'} size={72} jerseyNumber={user?.jersey_number} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '2px' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>@{user?.username}</div>
            {/* Role pill */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(227,27,35,.15)', color: '#fca5a5', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                {label(PLAYER_ROLES, user?.player_role ?? 'batsman')}
              </span>
              <span style={{ background: 'rgba(255,255,255,.07)', color: '#d1d5db', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>
                {label(BATTING_STYLES, user?.batting_style ?? 'right_hand')}
              </span>
              {user?.bowling_style && user.bowling_style !== 'none' && (
                <span style={{ background: 'rgba(139,92,246,.15)', color: '#c4b5fd', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>
                  {label(BOWLING_STYLES, user.bowling_style)}
                </span>
              )}
            </div>
            {user?.batting_position && (
              <div style={{ fontSize: '11px', color: 'var(--dim)' }}>
                {label(BATTING_POSITIONS, user.batting_position)}
                {user?.preferred_ground ? ` · ${user.preferred_ground}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {user?.bio && (
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.5 }}>{user.bio}</div>
        )}

        {/* Quick stat overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { v: batting?.runs ?? 0,                        l: 'Runs' },
            { v: bowling?.wickets ?? 0,                     l: 'Wickets', red: true },
            { v: Number(batting?.average ?? 0).toFixed(1),  l: 'Avg' },
            { v: batting?.matches ?? 0,                     l: 'Matches' },
          ].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,.05)', borderRadius: '12px', padding: '12px 4px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: s.red ? '#e31b23' : '#fff' }}>{s.v}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Badges Earned</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {earnedBadges.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.05)', borderRadius: '20px', padding: '6px 12px', border: `1px solid ${b.color}33` }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--dim)' }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats tab bar */}
        <div style={{ display: 'flex', background: 'var(--s1)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
          {(['batting','bowling','fielding'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: activeTab === t ? '#e31b23' : 'transparent', color: activeTab === t ? '#fff' : '#6b7280', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s' }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Batting Stats */}
        {activeTab === 'batting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {/* Hero metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(227,27,35,.2),rgba(227,27,35,.05))', border: '1px solid rgba(227,27,35,.25)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{batting?.runs ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Runs</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>HS: {batting?.highest_score ?? 0}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#22c55e', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{Number(batting?.strike_rate ?? 0).toFixed(0)}</div>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Strike Rate</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>Avg: {Number(batting?.average ?? 0).toFixed(1)}</div>
              </div>
            </div>
            {/* Secondary metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { v: batting?.innings ?? 0,    l: 'Innings',  sub: `${batting?.not_outs ?? 0} NO` },
                { v: batting?.balls_faced ?? 0, l: 'Balls',   sub: '' },
                { v: batting?.matches ?? 0,    l: 'Matches',  sub: '' },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{s.v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.l}</div>
                  {s.sub && <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '1px' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
            {/* Boundary row */}
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{batting?.fours ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Fours</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316' }}>{batting?.sixes ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Sixes</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{batting?.fifties ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>50s</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#e31b23' }}>{batting?.hundreds ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>100s</div>
              </div>
            </div>
          </div>
        )}

        {/* Bowling Stats */}
        {activeTab === 'bowling' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(139,92,246,.05))', border: '1px solid rgba(139,92,246,.25)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{bowling?.wickets ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Wickets</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>Best: {bowling?.best_figures ?? '-'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#22c55e', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{Number(bowling?.economy ?? 0).toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Economy</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>SR: {Number(bowling?.strike_rate ?? 0).toFixed(1)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { v: Number(bowling?.overs_bowled ?? 0).toFixed(1), l: 'Overs' },
                { v: bowling?.runs_conceded ?? 0,                    l: 'Runs' },
                { v: bowling?.maidens ?? 0,                          l: 'Maidens' },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{s.v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{bowling?.dot_balls ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Dots</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{bowling?.five_wkt_hauls ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>5-Wkt</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{bowling?.matches ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Matches</div>
              </div>
            </div>
          </div>
        )}

        {/* Fielding Stats */}
        {activeTab === 'fielding' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { v: fielding?.catches ?? 0,         l: 'Catches',        color: '#22c55e',  bg: 'rgba(34,197,94,.15)',   border: 'rgba(34,197,94,.25)' },
              { v: fielding?.run_outs ?? 0,         l: 'Run Outs',       color: '#f97316',  bg: 'rgba(249,115,22,.1)',   border: 'rgba(249,115,22,.2)' },
              { v: fielding?.stumpings ?? 0,        l: 'Stumpings',      color: '#a78bfa',  bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.2)' },
              { v: fielding?.dropped_catches ?? 0,  l: 'Dropped',        color: '#f87171',  bg: 'rgba(248,113,113,.08)',border: 'rgba(248,113,113,.15)' },
            ].map(s => (
              <div key={s.l} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '16px', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '44px', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{s.v}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginTop: '6px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Recent Matches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.map((m: any) => {
                // Format date
                let dateStr = '';
                if (m.match_date) {
                  try {
                    const d = new Date(m.match_date);
                    dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  } catch {}
                } else if (m.created_at) {
                  try {
                    dateStr = new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  } catch {}
                }
                // Format time
                let timeStr = '';
                if (m.match_time) {
                  try {
                    const t = typeof m.match_time === 'string' ? m.match_time : new Date(m.match_time).toISOString();
                    const [h, min] = t.slice(t.indexOf('T') >= 0 ? t.indexOf('T') + 1 : 0).split(':');
                    const hr = parseInt(h);
                    if (!isNaN(hr)) timeStr = `${hr > 12 ? hr - 12 : hr || 12}:${min} ${hr >= 12 ? 'PM' : 'AM'}`;
                  } catch {}
                }
                const meta = [m.code, dateStr, timeStr, m.ground].filter(Boolean).join(' · ');

                return (
                  <div
                    key={m.id}
                    onClick={() => m.code && router.push(`/match/${m.code}`)}
                    style={{ background: 'var(--s1)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name ?? m.code}</div>
                      <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                          textTransform: 'uppercase', letterSpacing: '.4px',
                          background: m.status === 'active' ? 'var(--live-lo)' : m.status === 'finished' ? 'rgba(100,100,100,.1)' : 'var(--blue-lo)',
                          color: m.status === 'active' ? 'var(--live)' : m.status === 'finished' ? 'var(--muted)' : 'var(--blue)',
                          border: `1px solid ${m.status === 'active' ? 'rgba(249,115,22,.25)' : m.status === 'finished' ? 'rgba(255,255,255,.07)' : 'rgba(96,165,250,.2)'}`,
                        }}>{m.status}</span>
                      </div>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--dim)" strokeWidth="2" style={{ flexShrink: 0, marginLeft: '8px' }}>
                      <path strokeLinecap="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <BottomNavigation />
    </div>
  );
}

