'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'var(--s2)', border: '1px solid var(--border)',
  borderRadius: '10px', padding: '12px 14px', color: 'var(--txt)', fontSize: '14px',
  boxSizing: 'border-box',
};

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/login'); return; }
        setForm({
          batting_style:    d.user?.batting_style    ?? 'right_hand',
          bowling_style:    d.user?.bowling_style    ?? 'none',
          player_role:      d.user?.player_role      ?? 'batsman',
          batting_position: d.user?.batting_position ?? 'middle_order',
          jersey_number:    d.user?.jersey_number    ?? '',
          bio:              d.user?.bio              ?? '',
          preferred_ground: d.user?.preferred_ground ?? '',
        });
        setLoaded(true);
      })
      .catch(() => router.push('/login'));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    router.push('/profile');
  };

  if (!loaded) return (
    <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Loading…</p>
    </div>
  );

  return (
    <div className="screen" style={{ paddingBottom: '80px', overflowY: 'auto' }}>

      {/* Header */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }} onClick={() => router.back()}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="heading" style={{ fontSize: '20px' }}>Edit Profile</div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Select fields */}
          {[
            { label: 'Player Role', key: 'player_role', options: PLAYER_ROLES },
            { label: 'Batting Style', key: 'batting_style', options: BATTING_STYLES },
            { label: 'Bowling Style', key: 'bowling_style', options: BOWLING_STYLES },
            { label: 'Batting Position', key: 'batting_position', options: BATTING_POSITIONS },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{f.label}</div>
              <select
                value={form[f.key] ?? ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={fieldStyle}
              >
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}

          {/* Jersey number */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Jersey Number</div>
            <input
              type="number" min={1} max={999}
              value={form.jersey_number ?? ''}
              onChange={e => setForm(p => ({ ...p, jersey_number: e.target.value }))}
              placeholder="e.g. 18"
              style={fieldStyle}
            />
          </div>

          {/* Preferred ground */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Preferred Ground</div>
            <input
              value={form.preferred_ground ?? ''}
              onChange={e => setForm(p => ({ ...p, preferred_ground: e.target.value }))}
              placeholder="e.g. Surat Cricket Ground"
              style={fieldStyle}
            />
          </div>

          {/* Bio */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Bio</div>
            <textarea
              value={form.bio ?? ''}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              placeholder="A short bio about yourself…"
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: 'var(--live)', color: '#fff', border: 'none', borderRadius: '12px',
              padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              opacity: saving ? 0.6 : 1, marginTop: '4px',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
