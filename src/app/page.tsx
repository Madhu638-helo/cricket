'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({ runs: 0, wickets: 0, catches: 0, mvps: 0 });

  useEffect(() => {
    // Show cached data immediately (no flicker)
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
  }, [router]);

  const loadDashboard = async () => {
    const res = await fetch('/api/user/dashboard');
    if (res.ok) {
      const data = await res.json();
      const s = data.stats || { runs: 0, wickets: 0, catches: 0, mvps: 0 };
      const lm = data.liveMatches || [];
      const um = data.upcomingMatches || [];
      setStats(s);
      setLiveMatches(lm);
      setUpcomingMatches(um);
      try { localStorage.setItem('tc_dashboard', JSON.stringify({ stats: s, liveMatches: lm, upcomingMatches: um })); } catch {}
    }
  };

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ padding: 'calc(16px + env(safe-area-inset-top, 20px)) 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', fontFamily: 'Barlow, sans-serif' }}>
            Good {greeting()}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.5px', marginTop: '1px' }}>
            {user?.name || 'Player'}
          </div>
        </div>
        <button
          onClick={() => router.push('/profile')}
          style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--live)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0', flexShrink: 0 }}
        >
          {user ? initials(user.name) : 'P'}
        </button>
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>

        {/* CTA buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => router.push('/create')}
            style={{ background: 'var(--live)', color: '#fff', border: 'none', padding: '16px 12px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.3px', boxShadow: '0 4px 16px rgba(249,115,22,.3)' }}
          >
            + Create Match
          </button>
          <button
            onClick={() => router.push('/join')}
            style={{ background: 'var(--s2)', color: 'var(--txt)', border: '1px solid var(--border)', padding: '16px 12px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.3px' }}
          >
            Join →
          </button>
        </div>

        {/* Live matches */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
            <span className="ldot" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--live)', letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif' }}>Live</span>
          </div>

          {liveMatches.length === 0 ? (
            <div style={{ padding: '20px', background: 'var(--s1)', borderRadius: '10px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', border: '1px solid var(--border)', fontFamily: 'Barlow, sans-serif' }}>
              No live matches right now
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveMatches.map(m => (
                <div
                  key={m.code}
                  onClick={() => router.push(`/match/${m.code}`)}
                  style={{ background: 'var(--s1)', borderRadius: '10px', border: '1px solid rgba(249,115,22,.2)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 0 20px rgba(249,115,22,.06)' }}
                >
                  {/* Card header */}
                  <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="ldot" />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--live)', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>LIVE</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>· {m.matchName || 'Match'}</span>
                    </div>
                    {m.expectedEndAt && (
                      <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>
                        Ends ~{new Date(m.expectedEndAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Scores */}
                  <div style={{ padding: '12px' }}>
                    {/* Batting team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--live)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: '#fff', flexShrink: 0 }}>
                          {abbr(m.battingTeamName || '')}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.battingTeamName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1 }}>{m.runs}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow Condensed, sans-serif' }}>/{m.wickets}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginLeft: '4px' }}>({m.overs})</span>
                      </div>
                    </div>

                    {/* Bowling team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--muted)', flexShrink: 0 }}>
                          {abbr(m.bowlingTeamName || '')}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.bowlingTeamName}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', flexShrink: 0 }}>
                        CRR <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px' }}>{m.crr}</span>
                      </span>
                    </div>

                    {/* Situation line */}
                    {m.target ? (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#fca5a5', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                        Need {Math.max(0, m.target - m.runs)} runs to win
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif', marginBottom: '10px' }}>
            Upcoming
          </div>
          {upcomingMatches.length === 0 ? (
            <div style={{ padding: '20px', background: 'var(--s1)', borderRadius: '10px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', border: '1px solid var(--border)', fontFamily: 'Barlow, sans-serif' }}>
              No upcoming matches
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingMatches.map(m => (
                <div
                  key={m.code}
                  onClick={() => router.push(`/match/${m.code}/lobby`)}
                  style={{ background: 'var(--s1)', borderRadius: '10px', border: '1px solid var(--border)', padding: '12px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ background: 'var(--blue-lo)', color: 'var(--blue)', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '.4px', fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', border: '1px solid rgba(96,165,250,.2)' }}>
                      Upcoming
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif' }}>{m.date} · {m.time}</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Barlow, sans-serif', marginBottom: '2px' }}>{m.matchName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginBottom: '10px' }}>
                    {m.format} · {m.aside}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ display: 'flex' }}>
                        {m.players?.slice(0, 3).map((p: any, i: number) => (
                          <div key={p.id} style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: ['var(--live)', 'var(--blue)', 'var(--green)'][i % 3],
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: 800, marginLeft: i > 0 ? '-6px' : '0',
                            border: '2px solid var(--s1)', fontFamily: 'Barlow Condensed, sans-serif',
                          }}>
                            {initials(p.name)[0]}
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginLeft: '4px' }}>{m.playerCount} joined</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--dim)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '1px', fontWeight: 700, background: 'var(--s2)', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      {m.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick stats */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif' }}>My Stats</span>
            <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--live)', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Runs', val: stats.runs, color: 'var(--green)' },
              { label: 'Wkts', val: stats.wickets, color: '#f87171' },
              { label: 'Catches', val: stats.catches, color: 'var(--blue)' },
              { label: 'MVPs', val: stats.mvps, color: 'var(--gold)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--s1)', borderRadius: '10px', padding: '14px 0', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: s.color, lineHeight: 1, marginBottom: '3px' }}>{s.val}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <BottomNavigation />
    </div>
  );
}
