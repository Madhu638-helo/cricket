'use client';
import React, { useState, useEffect } from 'react';
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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/login'); return; }
        setData(d);
        setEditForm({
          batting_style:    d.user?.batting_style    ?? 'right_hand',
          bowling_style:    d.user?.bowling_style    ?? 'none',
          player_role:      d.user?.player_role      ?? 'batsman',
          batting_position: d.user?.batting_position ?? 'middle_order',
          jersey_number:    d.user?.jersey_number    ?? '',
          bio:              d.user?.bio              ?? '',
          preferred_ground: d.user?.preferred_ground ?? '',
        });
      })
      .catch(() => router.push('/login'));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const res = await fetch('/api/user/profile').then(r => r.json());
    setData(res);
    setSaving(false);
    setEditing(false);
  };

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
          <button
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={user?.name ?? 'P'} size={72} />
            {user?.jersey_number && (
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#e31b23', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '8px', padding: '1px 5px', border: '2px solid #000' }}>
                #{user.jersey_number}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '2px' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>@{user?.username}</div>
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
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {label(BATTING_POSITIONS, user.batting_position)}
                {user?.preferred_ground ? ` · ${user.preferred_ground}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {user?.bio && (
          <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', lineHeight: 1.5 }}>{user.bio}</div>
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
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(e => !e)}
          style={{ background: editing ? '#e31b23' : 'rgba(255,255,255,.08)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
        >
          {editing ? 'Cancel Editing' : 'Edit Cricket Profile'}
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* Edit form */}
        {editing && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#9ca3af', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Cricket Profile</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {[
                { label: 'Player Role', key: 'player_role', options: PLAYER_ROLES },
                { label: 'Batting Style', key: 'batting_style', options: BATTING_STYLES },
                { label: 'Bowling Style', key: 'bowling_style', options: BOWLING_STYLES },
                { label: 'Batting Position', key: 'batting_position', options: BATTING_POSITIONS },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{f.label}</div>
                  <select
                    value={editForm[f.key] ?? ''}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px' }}
                  >
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Jersey Number</div>
                <input
                  type="number" min={1} max={999}
                  value={editForm.jersey_number ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, jersey_number: e.target.value }))}
                  placeholder="e.g. 18"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Preferred Ground</div>
                <input
                  value={editForm.preferred_ground ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, preferred_ground: e.target.value }))}
                  placeholder="e.g. Surat Cricket Ground"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Bio</div>
                <textarea
                  value={editForm.bio ?? ''}
                  onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="A short bio about yourself…"
                  rows={3}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{ background: '#e31b23', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Badges Earned</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {earnedBadges.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.05)', borderRadius: '20px', padding: '6px 12px', border: `1px solid ${b.color}33` }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.label}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats tab bar */}
        <div style={{ display: 'flex', background: '#111', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
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
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>HS: {batting?.highest_score ?? 0}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#22c55e', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{Number(batting?.strike_rate ?? 0).toFixed(0)}</div>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Strike Rate</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Avg: {Number(batting?.average ?? 0).toFixed(1)}</div>
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
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.l}</div>
                  {s.sub && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
            {/* Boundary row */}
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{batting?.fours ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Fours</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316' }}>{batting?.sixes ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Sixes</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{batting?.fifties ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>50s</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#e31b23' }}>{batting?.hundreds ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>100s</div>
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
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Best: {bowling?.best_figures ?? '-'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: '#22c55e', lineHeight: 1, fontFamily: "'Space Grotesk',sans-serif" }}>{Number(bowling?.economy ?? 0).toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Economy</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>SR: {Number(bowling?.strike_rate ?? 0).toFixed(1)}</div>
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
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{bowling?.dot_balls ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Dots</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa' }}>{bowling?.five_wkt_hauls ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>5-Wkt</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{bowling?.matches ?? 0}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Matches</div>
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
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '6px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>Recent Matches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentMatches.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => m.code && router.push(`/match/${m.code}`)}
                  style={{ background: '#111', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #1f1f1f', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.name ?? m.code}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{m.code} · {m.status}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <BottomNavigation />
    </div>
  );
}
