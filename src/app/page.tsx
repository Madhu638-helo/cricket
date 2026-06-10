'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BottomNavigation from '@/components/nav/BottomTabBar';

interface UserInfo { id: string; name: string }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function abbr(name: string) {
  if (!name) return '???';
  const w = name.trim().split(/\s+/);
  return w.length === 1 ? name.slice(0, 3).toUpperCase() : w.map(x => x[0]).join('').toUpperCase().slice(0, 4);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const STATS_CONFIG = [
  { label: 'Runs',    key: 'runs',    color: 'var(--green)',  lo: 'var(--green-lo)',   border: 'rgba(48,209,88,.25)' },
  { label: 'Wkts',   key: 'wickets', color: '#f87171',       lo: 'rgba(248,113,113,.06)', border: 'rgba(248,113,113,.25)' },
  { label: 'Catches',key: 'catches', color: 'var(--blue)',   lo: 'var(--blue-lo)',    border: 'rgba(10,132,255,.25)' },
  { label: 'MVPs',   key: 'mvps',    color: 'var(--gold)',   lo: 'var(--gold-lo)',    border: 'rgba(255,214,10,.25)' },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [champions, setChampions] = useState<{ name: string; wins: number }[]>([]);
  const [stats, setStats] = useState({ runs: 0, wickets: 0, catches: 0, mvps: 0 });
  const [displayStats, setDisplayStats] = useState({ runs: 0, wickets: 0, catches: 0, mvps: 0 });
  const [joinCode, setJoinCode] = useState('');
  const [dashLoading, setDashLoading] = useState(true);
  const supabase = useRef(createClient()).current;

  // Animated counter — ease-out quad, 0 → target over 700ms
  useEffect(() => {
    const keys = ['runs', 'wickets', 'catches', 'mvps'] as const;
    const duration = 700;
    const steps = 28;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - (1 - progress) * (1 - progress); // ease-out quad
      setDisplayStats({
        runs:    Math.round(stats.runs    * eased),
        wickets: Math.round(stats.wickets * eased),
        catches: Math.round(stats.catches * eased),
        mvps:    Math.round(stats.mvps    * eased),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [stats]);

  // Lightweight refresh — only updates live match scores, no full dashboard reload
  const refreshLive = useCallback(async () => {
    const res = await fetch('/api/user/dashboard', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setLiveMatches(data.liveMatches || []);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('tc_dashboard');
      if (cached) {
        const { stats: s, liveMatches: lm, upcomingMatches: um } = JSON.parse(cached);
        if (s) setStats(s);
        if (lm) setLiveMatches(lm);
        if (um) setUpcomingMatches(um);
      }
    } catch {}

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) { router.push('/login'); return; }
        setUser(user);
        loadDashboard();
      })
      .catch(() => router.push('/login'));

    // Realtime: update live match scores when innings scores change
    const channel = supabase.channel('home:live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'innings' }, () => refreshLive())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => refreshLive())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router, supabase, refreshLive]);

  const loadDashboard = async () => {
    setDashLoading(true);
    const res = await fetch('/api/user/dashboard', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const s = data.stats || { runs: 0, wickets: 0, catches: 0, mvps: 0 };
      const lm = data.liveMatches || [];
      const um = data.upcomingMatches || [];
      const ch = data.champions || [];
      setStats(s);
      setLiveMatches(lm);
      setUpcomingMatches(um);
      setChampions(ch);
      try { localStorage.setItem('tc_dashboard', JSON.stringify({ stats: s, liveMatches: lm, upcomingMatches: um })); } catch {}
    }
    setDashLoading(false);
  };

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>

      {/* ── Hero: stadium background + brand + greeting ── */}
      <div style={{
        position: 'relative',
        height: '160px',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Stadium bg image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/cricket_stadium_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          pointerEvents: 'none',
        }} />
        {/* Dark overlay */}
        <div
          className="hero-overlay"
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(8,8,8,0.65)',
            pointerEvents: 'none',
          }}
        />
        {/* Gradient fade to bg at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
        }} />

        {/* Content over hero */}
        <div style={{
          position: 'relative', zIndex: 1,
          height: '100%',
          padding: 'calc(env(safe-area-inset-top, 20px) + 16px) 18px 16px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* App brand name */}
            <div
              className="hero-brand-name anim-fade-up"
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '28px',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                lineHeight: 1,
                textShadow: '0 2px 12px rgba(0,0,0,.5)',
              }}
            >
              Turf
            </div>
            {/* Avatar button */}
            <button
              className="avatar-btn anim-fade-up d1"
              onClick={() => router.push('/profile')}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--live), #ea6c0a)',
                border: '2px solid rgba(249,115,22,.4)',
                boxShadow: '0 4px 16px rgba(249,115,22,.35)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '15px', color: '#fff',
                fontFamily: 'Barlow Condensed, sans-serif', flexShrink: 0,
              }}
              aria-label="View profile"
            >
              {user ? initials(user.name) : '?'}
            </button>
          </div>

          {/* Greeting + name */}
          <div className="anim-fade-up d2">
            <div
              className="hero-greeting"
              style={{
                fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.6)',
                textTransform: 'uppercase', letterSpacing: '1px',
                fontFamily: 'Barlow, sans-serif',
              }}
            >
              Good {greeting()}
            </div>
            <div
              className="hero-username"
              style={{
                fontSize: '24px', fontWeight: 900,
                fontFamily: 'Barlow Condensed, sans-serif',
                color: '#fff',
                letterSpacing: '-0.3px', lineHeight: 1.1, marginTop: '2px',
                textShadow: '0 2px 8px rgba(0,0,0,.4)',
              }}
            >
              {user?.name || 'Player'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content below hero ── */}
      <div style={{
        padding: '0 14px',
        display: 'flex', flexDirection: 'column', gap: '22px',
        paddingBottom: '24px',
      }}>

        {/* ── CTA row: New Match + Join code ── */}
        <div
          className="card cta-card anim-fade-up"
          style={{ padding: '14px', borderRadius: '16px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Create Match — animated gradient orange */}
            <button
              onClick={() => router.push('/create')}
              className="anim-gradient"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c, #fb923c, #ea580c)',
                color: '#fff', border: 'none',
                padding: '0 12px', height: '56px',
                borderRadius: '12px', fontSize: '16px', fontWeight: 900,
                cursor: 'pointer',
                fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.5px',
                boxShadow: '0 4px 18px rgba(249,115,22,.40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
              aria-label="Create new match"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Match
            </button>

            {/* Join with inline code entry */}
            <div style={{ position: 'relative' }}>
              <input
                className="join-input"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && joinCode.length >= 4)
                    router.push(`/join?code=${joinCode}`);
                }}
                placeholder="ENTER CODE"
                aria-label="Enter match join code"
                style={{
                  width: '100%', height: '56px',
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '0 46px 0 14px',
                  fontSize: '15px', fontWeight: 800, color: 'var(--txt)',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px',
                  outline: 'none', cursor: 'text',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,.12)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              />
              <button
                onClick={() => joinCode.length >= 4 && router.push(`/join?code=${joinCode}`)}
                aria-label="Join match"
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '34px', height: '34px', borderRadius: '8px',
                  background: joinCode.length >= 4 ? 'var(--live)' : 'var(--s3)',
                  border: 'none', cursor: joinCode.length >= 4 ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .2s',
                  color: joinCode.length >= 4 ? '#fff' : 'var(--muted)',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── LIVE section ── */}
        <section className="anim-fade-up d2">
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
            <span className="ldot" aria-hidden="true" />
            <span
              className="section-live-label"
              style={{
                fontSize: '11px', fontWeight: 800,
                color: 'var(--live)', letterSpacing: '1px',
                textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif',
              }}
            >
              Live
            </span>
            {liveMatches.length > 0 && (
              <span style={{
                marginLeft: '2px', fontSize: '10px',
                background: 'var(--live)', color: '#fff',
                borderRadius: '10px', padding: '1px 7px',
                fontWeight: 800, fontFamily: 'Barlow, sans-serif',
              }}>
                {liveMatches.length}
              </span>
            )}
          </div>

          {dashLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="skel" style={{ height: '100px', borderRadius: '14px' }} />
            </div>
          ) : liveMatches.length === 0 ? (
            /* Empty state with pitch illustration */
            <div
              className="card"
              style={{
                padding: '32px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                textAlign: 'center',
              }}
            >
              <img
                src="/empty_state_pitch.png"
                alt="No live matches in progress"
                style={{ width: '40px', height: '40px', objectFit: 'contain', opacity: 0.75 }}
              />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', marginBottom: '3px' }}>
                  No live matches
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                  Create one or wait for your game to start
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveMatches.map((m, idx) => (
                <div
                  key={m.code}
                  onClick={() => router.push(`/match/${m.code}`)}
                  className={`live-match-card card-press live-card-glow anim-scale-up d${Math.min(idx + 1, 6)}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Live match: ${m.matchName}`}
                  onKeyDown={e => e.key === 'Enter' && router.push(`/match/${m.code}`)}
                  style={{
                    background: 'var(--s1)',
                    borderRadius: '14px',
                    border: '1px solid rgba(249,115,22,.25)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  {/* Live gradient strip */}
                  <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, var(--live), #fb923c, transparent)',
                  }} />

                  {/* Card header */}
                  <div style={{
                    padding: '10px 14px 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="ldot" style={{ width: '5px', height: '5px' }} aria-hidden="true" />
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--live)', letterSpacing: '.6px', fontFamily: 'Barlow, sans-serif' }}>
                        LIVE
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                        · {m.matchName || 'Match'}
                      </span>
                    </div>
                    {m.expectedEndAt && (
                      <span style={{ fontSize: '10px', color: 'var(--dim)', fontFamily: 'Barlow, sans-serif' }}>
                        ~{new Date(m.expectedEndAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Score body */}
                  <div style={{ padding: '8px 14px 14px' }}>
                    {/* Batting team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--live), #ea6c0a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
                          color: '#fff', flexShrink: 0,
                        }}>
                          {abbr(m.battingTeamName || '')}
                        </div>
                        <span style={{
                          fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.battingTeamName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                        <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1, letterSpacing: '-1px' }}>
                          {m.runs}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          /{m.wickets}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--dim)', fontFamily: 'Barlow, sans-serif', marginLeft: '4px' }}>
                          ({m.overs})
                        </span>
                      </div>
                    </div>

                    {/* Bowling team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          background: 'var(--s3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
                          color: 'var(--muted)', flexShrink: 0,
                        }}>
                          {abbr(m.bowlingTeamName || '')}
                        </div>
                        <span style={{
                          fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.bowlingTeamName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                          CRR{' '}
                          <span style={{ color: 'var(--green)', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px' }}>
                            {m.crr}
                          </span>
                        </span>
                        {m.target > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--live)', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                            Need {Math.max(0, m.target - m.runs)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming section ── */}
        {upcomingMatches.length > 0 && (
          <section className="anim-fade-up d3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 800, color: 'var(--muted)',
                letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif',
              }}>
                Upcoming
              </span>
              <span style={{
                fontSize: '10px', color: 'var(--blue)',
                background: 'var(--blue-lo)',
                border: '1px solid rgba(10,132,255,.2)',
                borderRadius: '10px', padding: '2px 8px',
                fontWeight: 800, fontFamily: 'Barlow, sans-serif',
              }}>
                {upcomingMatches.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingMatches.map((m, idx) => (
                <div
                  key={m.code}
                  onClick={() => router.push(`/match/${m.code}/lobby`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Upcoming match: ${m.matchName}`}
                  onKeyDown={e => e.key === 'Enter' && router.push(`/match/${m.code}/lobby`)}
                  className={`upcoming-match-card card-press anim-fade-up d${Math.min(idx + 1, 6)}`}
                  style={{
                    background: 'var(--s1)',
                    borderRadius: '14px',
                    border: '1px solid rgba(10,132,255,.25)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, var(--blue), #60a5fa, transparent)',
                  }} />

                  <div style={{ padding: '10px 14px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '15px', fontWeight: 800, fontFamily: 'Barlow, sans-serif',
                        flex: 1, marginRight: '8px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.matchName}
                      </div>
                      <span style={{
                        fontSize: '11px', color: 'var(--dim)', fontFamily: 'Barlow Condensed, sans-serif',
                        letterSpacing: '1px', fontWeight: 700, background: 'var(--s2)',
                        padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border)',
                        flexShrink: 0,
                      }}>
                        {m.code}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex' }}>
                          {m.players?.slice(0, 3).map((p: any, i: number) => (
                            <div
                              key={p.id}
                              className="player-avatar-overlap"
                              style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: ['var(--blue)', 'var(--green)', 'var(--gold)'][i % 3],
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px', fontWeight: 900,
                                marginLeft: i > 0 ? '-6px' : '0',
                                border: '2px solid var(--s1)',
                                fontFamily: 'Barlow Condensed, sans-serif',
                              }}
                            >
                              {initials(p.name)[0]}
                            </div>
                          ))}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                          {m.playerCount} joined
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          background: 'var(--blue-lo)', color: 'var(--blue)',
                          fontSize: '11px', fontWeight: 800, padding: '2px 8px',
                          borderRadius: '6px', border: '1px solid rgba(10,132,255,.15)',
                          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.5px'
                        }}>
                          {m.format}
                        </span>
                        {m.time && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.5px' }}>
                            {m.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── My Stats ── */}
        <section className="anim-fade-up d4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 800, color: 'var(--muted)',
              letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif',
            }}>
              My Stats
            </span>
            <button
              onClick={() => router.push('/profile')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: 'var(--live)', fontWeight: 700,
                fontFamily: 'Barlow, sans-serif',
              }}
              aria-label="View all stats"
            >
              View all →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {STATS_CONFIG.map((s, idx) => (
              <div
                key={s.key}
                className={`anim-pop-in d${idx + 1}${stats[s.key] === 0 ? ' stat-card-empty' : ''}`}
                style={{
                  background: stats[s.key] > 0 ? s.lo : 'var(--s1)',
                  borderRadius: '12px', padding: '14px 0 12px', textAlign: 'center',
                  border: `1px solid ${stats[s.key] > 0 ? s.border : 'var(--border)'}`,
                  transition: [
                    'background .4s cubic-bezier(0.22,1,0.36,1)',
                    'border-color .4s cubic-bezier(0.22,1,0.36,1)',
                    'box-shadow .4s cubic-bezier(0.22,1,0.36,1)',
                  ].join(', '),
                  boxShadow: stats[s.key] > 0 ? `0 4px 14px ${s.border}` : 'none',
                }}
              >
                <div style={{
                  fontSize: '26px', fontWeight: 900,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  color: stats[s.key] > 0 ? s.color : 'var(--dim)',
                  lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.5px',
                  transition: 'color .3s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  {displayStats[s.key]}
                </div>
                <div style={{
                  fontSize: '9px', color: 'var(--muted)',
                  fontFamily: 'Barlow, sans-serif', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.6px',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Champions ── */}
        {champions.length > 0 && (
          <section className="anim-fade-up d5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18h18M3 18l2-8 4.5 4L12 6l2.5 8L19 10l2 8H3z"/>
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif' }}>
                  All-Time Wins
                </span>
              </div>
              <button
                onClick={() => router.push('/leaderboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--live)', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}
              >
                Rankings →
              </button>
            </div>

            <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              {champions.map((c, i) => {
                const isFirst = i === 0;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const maxWins = champions[0].wins;
                const pct = maxWins > 0 ? (c.wins / maxWins) * 100 : 0;
                return (
                  <div
                    key={c.name}
                    style={{
                      padding: '11px 14px',
                      borderBottom: i < champions.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isFirst ? 'rgba(251,191,36,.04)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}
                  >
                    {/* Rank / medal */}
                    <div style={{ width: '24px', textAlign: 'center', flexShrink: 0, fontSize: '16px' }}>
                      {medal ?? <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--dim)', fontFamily: 'Barlow Condensed, sans-serif' }}>{i + 1}</span>}
                    </div>

                    {/* Name + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', color: isFirst ? '#fbbf24' : 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                        {c.name}
                      </div>
                      <div style={{ height: '3px', borderRadius: '2px', background: 'var(--s3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isFirst ? '#fbbf24' : 'var(--muted)', borderRadius: '2px', transition: 'width .5s cubic-bezier(.22,1,.36,1)' }} />
                      </div>
                    </div>

                    {/* Win count */}
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: isFirst ? '#fbbf24' : 'var(--txt)', lineHeight: 1 }}>{c.wins}</span>
                      <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                        {c.wins === 1 ? 'win' : 'wins'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>

      <BottomNavigation />
    </div>
  );
}
