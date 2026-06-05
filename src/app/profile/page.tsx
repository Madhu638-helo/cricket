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
  { id: 'fifty',     label: '50+',   desc: 'Half century',       img: '/badge_50_runs.png',  color: '#f59e0b', condition: (s: any) => s?.batting?.fifties > 0 },
  { id: 'century',   label: '100',   desc: 'Century',            img: '/badge_100_runs.png', color: '#e31b23', condition: (s: any) => s?.batting?.hundreds > 0 },
  { id: 'fivefer',   label: '5W',    desc: '5-wicket haul',      color: '#8b5cf6',           condition: (s: any) => s?.bowling?.five_wkt_hauls > 0 },
  { id: 'fielder',   label: 'CT',    desc: '10+ career catches', color: '#22c55e',           condition: (s: any) => s?.fielding?.catches >= 10 },
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
    <div className="screen">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0' }}>
          <div className="skel" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: '18px', width: '50%', marginBottom: '8px' }} />
            <div className="skel" style={{ height: '12px', width: '35%' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
          {[0,1,2,3].map(i => <div key={i} className="skel" style={{ height: '72px', borderRadius: '12px' }} />)}
        </div>
        {[100, 160, 140].map((h, i) => (
          <div key={i} className="skel" style={{ height: `${h}px`, borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  );

  const { user, batting, bowling, fielding, recentMatches } = data;
  const earnedBadges = BADGES.filter(b => b.condition(data));
  const label = (arr: {value:string;label:string}[], val: string) =>
    arr.find(x => x.value === val)?.label ?? val;

  return (
    <div id="s-profile" className="screen" style={{ paddingBottom: '80px', overflowY: 'auto' }}>

      {/* Header gradient — uses CSS var, works in both modes */}
      <div style={{ background: 'linear-gradient(180deg, var(--red-lo, rgba(227,27,35,.10)), transparent)', padding: '20px 20px 0' }}>

        {/* Top bar */}
        <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{
            fontSize: '22px', fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '-0.5px',
            color: 'var(--txt)',
          }}>Profile</div>

          {/* Three-dot menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="icon-btn"
              aria-label="Profile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
                boxShadow: '0 8px 32px rgba(0,0,0,.2)',
                display: 'flex', flexDirection: 'column'
              }}>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/profile/edit'); }}
                  className="dropdown-btn"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="dropdown-btn danger"
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
        <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={user?.name ?? 'P'} size={72} jerseyNumber={user?.jersey_number} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '2px', color: 'var(--txt)' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>@{user?.username}</div>
            {/* Role pills — var-based for light/dark */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(227,27,35,.13)', color: 'var(--red)',
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                border: '1px solid rgba(227,27,35,.18)',
              }}>
                {label(PLAYER_ROLES, user?.player_role ?? 'batsman')}
              </span>
              <span style={{
                background: 'var(--s3)', color: 'var(--txt)',
                fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                border: '1px solid var(--border)',
              }}>
                {label(BATTING_STYLES, user?.batting_style ?? 'right_hand')}
              </span>
              {user?.bowling_style && user.bowling_style !== 'none' && (
                <span style={{
                  background: 'rgba(139,92,246,.12)', color: 'var(--purple)',
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                  border: '1px solid rgba(139,92,246,.2)',
                }}>
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
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.6 }}>{user.bio}</div>
        )}

        {/* Quick stat overview — 4 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { v: batting?.runs ?? 0,                       l: 'Runs',    accent: (batting?.runs ?? 0) > 0 ? 'var(--green)' : 'var(--txt)', delay: 'd1' },
            { v: bowling?.wickets ?? 0,                    l: 'Wkts',    accent: (bowling?.wickets ?? 0) > 0 ? 'var(--red)' : 'var(--txt)', delay: 'd2' },
            { v: Number(batting?.average ?? 0).toFixed(1), l: 'Avg',     accent: 'var(--txt)', delay: 'd3' },
            { v: batting?.matches ?? 0,                    l: 'Matches', accent: 'var(--txt)', delay: 'd4' },
          ].map(s => (
            <div
              key={s.l}
              className={`anim-pop-in ${s.delay}`}
              style={{
                background: 'var(--s2)', borderRadius: '12px', padding: '12px 4px',
                textAlign: 'center', border: '1px solid var(--border)',
              }}
            >
              <div style={{
                fontSize: '20px', fontWeight: 900,
                fontFamily: 'Barlow Condensed, sans-serif',
                color: s.accent,
                lineHeight: 1,
              }}>{s.v}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="anim-fade-up" style={{ padding: '0 20px' }}>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px',
            }}>Badges Earned</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {earnedBadges.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--s2)', borderRadius: '20px', padding: '6px 12px',
                    border: `1px solid ${b.color}30`,
                  }}
                >
                  {b.img ? (
                    <img src={b.img} alt={b.label} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--dim)' }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats tab bar — uses CSS classes for light/dark auto-switch */}
        <div className="toggle" style={{ marginBottom: '20px' }}>
          {(['batting','bowling','fielding'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`toggle-btn${activeTab === t ? ' on' : ''}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Batting Stats */}
        {activeTab === 'batting' && (
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {/* Hero metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(227,27,35,.15), rgba(227,27,35,.04))',
                border: '1px solid rgba(227,27,35,.22)',
                borderRadius: '16px', padding: '16px',
              }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--red)', lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>{batting?.runs ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px', opacity: .75 }}>Total Runs</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>HS: {batting?.highest_score ?? 0}</div>
              </div>
              <div style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px',
              }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--green)', lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>{Number(batting?.strike_rate ?? 0).toFixed(0)}</div>
                <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px', opacity: .75 }}>Strike Rate</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>Avg: {Number(batting?.average ?? 0).toFixed(1)}</div>
              </div>
            </div>

            {/* Secondary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { v: batting?.innings ?? 0,     l: 'Innings', sub: `${batting?.not_outs ?? 0} NO` },
                { v: batting?.balls_faced ?? 0,  l: 'Balls',   sub: '' },
                { v: batting?.matches ?? 0,      l: 'Matches', sub: '' },
              ].map(s => (
                <div key={s.l} style={{
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)', fontFamily: 'Barlow Condensed, sans-serif' }}>{s.v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.l}</div>
                  {s.sub && <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '1px' }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Boundary row */}
            <div style={{
              background: 'var(--s2)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', justifyContent: 'space-around',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'Barlow Condensed, sans-serif' }}>{batting?.fours ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Fours</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--live)', fontFamily: 'Barlow Condensed, sans-serif' }}>{batting?.sixes ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Sixes</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--purple)', fontFamily: 'Barlow Condensed, sans-serif' }}>{batting?.fifties ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>50s</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--red)', fontFamily: 'Barlow Condensed, sans-serif' }}>{batting?.hundreds ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>100s</div>
              </div>
            </div>
          </div>
        )}

        {/* Bowling Stats */}
        {activeTab === 'bowling' && (
          <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,.15), rgba(139,92,246,.04))',
                border: '1px solid rgba(139,92,246,.22)',
                borderRadius: '16px', padding: '16px',
              }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--purple)', lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>{bowling?.wickets ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px', opacity: .75 }}>Wickets</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>Best: {bowling?.best_figures ?? '-'}</div>
              </div>
              <div style={{
                background: 'var(--s2)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px',
              }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--green)', lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>{Number(bowling?.economy ?? 0).toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px', opacity: .75 }}>Economy</div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '2px' }}>SR: {Number(bowling?.strike_rate ?? 0).toFixed(1)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { v: Number(bowling?.overs_bowled ?? 0).toFixed(1), l: 'Overs' },
                { v: bowling?.runs_conceded ?? 0,                    l: 'Runs' },
                { v: bowling?.maidens ?? 0,                          l: 'Maidens' },
              ].map(s => (
                <div key={s.l} style={{
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--txt)', fontFamily: 'Barlow Condensed, sans-serif' }}>{s.v}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--s2)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', justifyContent: 'space-around',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'Barlow Condensed, sans-serif' }}>{bowling?.dot_balls ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Dots</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--purple)', fontFamily: 'Barlow Condensed, sans-serif' }}>{bowling?.five_wkt_hauls ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>5-Wkt</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', fontFamily: 'Barlow Condensed, sans-serif' }}>{bowling?.matches ?? 0}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Matches</div>
              </div>
            </div>
          </div>
        )}

        {/* Fielding Stats */}
        {activeTab === 'fielding' && (
          <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { v: fielding?.catches ?? 0,        l: 'Catches',   color: 'var(--green)',  bg: 'rgba(34,197,94,.10)',   border: 'rgba(34,197,94,.20)' },
              { v: fielding?.run_outs ?? 0,        l: 'Run Outs',  color: 'var(--live)',   bg: 'rgba(249,115,22,.08)',  border: 'rgba(249,115,22,.18)' },
              { v: fielding?.stumpings ?? 0,       l: 'Stumpings', color: 'var(--purple)', bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.18)' },
              { v: fielding?.dropped_catches ?? 0, l: 'Dropped',   color: 'var(--red)',    bg: 'rgba(227,27,35,.07)',  border: 'rgba(227,27,35,.14)' },
            ].map(s => (
              <div key={s.l} style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: '16px', padding: '20px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '44px', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>{s.v}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginTop: '6px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <div className="anim-fade-up" style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px',
            }}>Recent Matches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.map((m: any) => {
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
                    style={{
                      background: 'var(--s1)', borderRadius: '12px', padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: 600, color: 'var(--txt)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.name ?? m.code}</div>
                      <div style={{
                        fontSize: '11px', color: 'var(--dim)', marginTop: '3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{meta}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                          textTransform: 'uppercase', letterSpacing: '.4px',
                          background: m.status === 'active' ? 'var(--live-lo)' : m.status === 'finished' ? 'var(--s3)' : 'var(--blue-lo)',
                          color: m.status === 'active' ? 'var(--live)' : m.status === 'finished' ? 'var(--muted)' : 'var(--blue)',
                          border: `1px solid ${m.status === 'active' ? 'rgba(249,115,22,.25)' : m.status === 'finished' ? 'var(--border)' : 'rgba(10,132,255,.2)'}`,
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
