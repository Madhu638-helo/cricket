'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateMatchCode } from '@/lib/cricket/engine';
import BottomNavigation from '@/components/nav/BottomTabBar';

const FORMAT_OPTIONS = [
  { label: '5 Ov',   value: '5 Ov',  icon: '⚡' },
  { label: '10 Ov',  value: '10 Ov', icon: '🏏' },
  { label: 'T20',    value: 'T20',   icon: '🔥' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
      letterSpacing: '.8px', marginBottom: '8px',
      textTransform: 'uppercase', fontFamily: 'Barlow, sans-serif',
    }}>
      {children}
    </div>
  );
}

export default function CreateMatchPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  const [sessionName, setSessionName] = useState('');
  const [format, setFormat] = useState('5 Ov');
  const [isCustom, setIsCustom] = useState(false);
  const [customOvers, setCustomOvers] = useState('');
  const [teamSize, setTeamSize] = useState('11');
  const [ballType, setBallType] = useState('Tennis');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [ground, setGround] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) { router.push('/login'); return; }
        setUser(user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleCreate = async () => {
    if (!sessionName.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      let code: string = '';
      let tries = 0;
      do {
        code = generateMatchCode();
        const { data: existing } = await supabase.from('sessions').select('id').eq('code', code).single();
        if (!existing) break;
        tries++;
      } while (tries < 5);

      let matchDate = null;
      let matchTime = null;
      if (date) matchDate = new Date(date).toISOString().split('T')[0];
      if (time) matchTime = time + ':00';

      const { data: session, error: sessionError } = await supabase.from('sessions').insert({
        code,
        name: sessionName,
        owner_id: user.id,
        status: 'lobby',
        ground: ground.trim() || null,
        match_date: matchDate,
        match_time: matchTime,
      }).select().single();

      if (!session || sessionError) {
        setError('Failed to create session. Please try again.');
        setLoading(false);
        return;
      }

      const { data: t1 } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team A' }).select().single();
      const { data: t2 } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team B' }).select().single();

      await supabase.from('players').insert({ session_id: session.id, name: user.name, user_id: user.id });

      const parseOvers = (f: string) => {
        if (f === 'T20') return 20;
        if (f === '10 Ov') return 10;
        if (f === '5 Ov') return 5;
        const n = parseInt(f);
        return isNaN(n) || n < 1 ? 5 : n;
      };

      await supabase.from('matches').insert({
        session_id: session.id,
        match_number: 1,
        overs: parseOvers(format),
        team1_id: t1.id,
        team2_id: t2.id,
        status: 'setup',
      });

      router.push(`/match/${code}/lobby`);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!sessionName.trim();

  return (
    <div id="s-create" className="screen">
      {/* Header */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', cursor: 'pointer' }}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.3px' }}>
            Create Match
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Match Name */}
        <div>
          <SectionLabel>Match Name</SectionLabel>
          <input
            className="inp"
            placeholder="Evening T20 · Surat Ground"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            aria-label="Match name"
          />
        </div>

        {/* Format */}
        <div>
          <SectionLabel>Format</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {FORMAT_OPTIONS.map(fmt => {
              const active = !isCustom && format === fmt.value;
              return (
                <button
                  key={fmt.value}
                  onClick={() => { setFormat(fmt.value); setIsCustom(false); }}
                  style={{
                    background: active ? 'var(--red)' : 'var(--s1)',
                    color: active ? '#fff' : 'var(--txt)',
                    border: active ? '1px solid var(--red)' : '1px solid var(--border)',
                    padding: '12px 0', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all .2s',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    boxShadow: active ? '0 4px 14px rgba(227,27,35,.3)' : 'none',
                  }}
                  aria-pressed={active}
                >
                  <span style={{ fontSize: '11px', opacity: active ? 1 : 0.5 }}>{fmt.icon}</span>
                  <span>{fmt.label}</span>
                </button>
              );
            })}
            {/* Custom overs */}
            {isCustom ? (
              <input
                autoFocus
                type="number"
                placeholder="Overs"
                value={customOvers}
                onChange={e => {
                  setCustomOvers(e.target.value);
                  setFormat(e.target.value ? e.target.value + ' Ov' : '');
                }}
                min="1"
                max="50"
                style={{
                  background: 'var(--red)', color: '#fff',
                  border: '1px solid var(--red)', padding: '12px 0',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                  outline: 'none', textAlign: 'center',
                  minWidth: 0, width: '100%',
                  fontFamily: 'Barlow Condensed, sans-serif', cursor: 'text',
                }}
              />
            ) : (
              <button
                onClick={() => { setIsCustom(true); setFormat(customOvers ? customOvers + ' Ov' : ''); }}
                style={{
                  background: 'var(--s1)', color: 'var(--muted)',
                  border: '1px dashed var(--border2)', padding: '12px 0',
                  borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all .2s',
                  fontFamily: 'Barlow, sans-serif',
                }}
              >
                Custom
              </button>
            )}
          </div>
        </div>

        {/* Team Size & Ball Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <SectionLabel>Team Size</SectionLabel>
            <input
              type="number"
              className="inp"
              placeholder="11"
              value={teamSize}
              onChange={e => setTeamSize(e.target.value)}
              min="1"
              max="30"
              aria-label="Team size"
            />
          </div>
          <div>
            <SectionLabel>Ball Type</SectionLabel>
            <input
              className="inp"
              placeholder="Tennis"
              value={ballType}
              onChange={e => setBallType(e.target.value)}
              aria-label="Ball type"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <SectionLabel>Date</SectionLabel>
            <input
              type="date"
              className="inp"
              style={{ minWidth: 0 }}
              value={date}
              onChange={e => setDate(e.target.value)}
              aria-label="Match date"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <SectionLabel>Time</SectionLabel>
            <input
              type="time"
              className="inp"
              style={{ minWidth: 0 }}
              value={time}
              onChange={e => setTime(e.target.value)}
              aria-label="Match time"
            />
          </div>
        </div>

        {/* Ground */}
        <div>
          <SectionLabel>Ground</SectionLabel>
          <input
            className="inp"
            placeholder="Surat Cricket Ground"
            value={ground}
            onChange={e => setGround(e.target.value)}
            aria-label="Ground name"
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '13px', color: '#f87171', fontFamily: 'Barlow, sans-serif',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: '4px' }}>
          <button
            className="btn btn-red btn-full"
            style={{
              padding: '16px', fontSize: '16px', fontWeight: 800,
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: canSubmit ? 1 : 0.45,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.5px',
            }}
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating…
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create &amp; Get Code
              </>
            )}
          </button>
          <div style={{
            textAlign: 'center', fontSize: '12px', color: 'var(--dim)',
            marginTop: '12px', fontFamily: 'Barlow, sans-serif',
          }}>
            A unique 6-character code will be generated for players to join
          </div>
        </div>

      </div>
      <BottomNavigation />
    </div>
  );
}
