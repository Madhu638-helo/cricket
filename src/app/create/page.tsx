'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateMatchCode } from '@/lib/cricket/engine';
import BottomNavigation from '@/components/nav/BottomTabBar';

export default function CreateMatchPage() {
  const router = useRouter();
  const supabase = createClient();
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
    let code: string;
    let tries = 0;
    do {
      code = generateMatchCode();
      const { data: existing } = await supabase.from('sessions').select('id').eq('code', code).single();
      if (!existing) break;
      tries++;
    } while (tries < 5);

    // Parse date and time if available
    let matchDate = null;
    let matchTime = null;
    if (date) matchDate = new Date(date).toISOString().split('T')[0];
    if (time) matchTime = time + ':00'; // Make it valid time format for postgres

    const { data: session, error } = await supabase.from('sessions').insert({
      code, 
      name: sessionName, 
      owner_id: user.id, 
      status: 'lobby',
      ground: ground.trim() || null,
      match_date: matchDate,
      match_time: matchTime
    }).select().single();

    if (!session || error) {
      console.error('Failed to create session:', error);
      setLoading(false);
      return;
    }

    // Default team names since UI doesn't ask for it now
    const { data: t1 } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team A' }).select().single();
    const { data: t2 } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team B' }).select().single();

    // Join the owner to the lobby automatically as an unassigned player
    await supabase.from('players').insert({ session_id: session.id, name: user.name, user_id: user.id });

    // Initialize the first match
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
      status: 'setup'
    });

    router.push(`/match/${code}/lobby`);
  };

  return (
    <div id="s-create" className="screen">
      <div className="hdr" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px' }} onClick={() => router.back()}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="heading" style={{ fontSize: '20px', fontWeight: 700 }}>Create Match</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Match Name */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Match Name</div>
          <input 
            className="inp" 
            placeholder="Evening T20 · Surat Ground" 
            value={sessionName} 
            onChange={e => setSessionName(e.target.value)} 
          />
        </div>

        {/* Format */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Format</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {['5 Ov', '10 Ov', 'T20'].map(fmt => (
              <button 
                key={fmt}
                onClick={() => { setFormat(fmt); setIsCustom(false); }}
                style={{
                  background: (!isCustom && format === fmt) ? 'var(--red)' : 'var(--s1)',
                  color: (!isCustom && format === fmt) ? '#fff' : 'var(--txt)',
                  border: (!isCustom && format === fmt) ? '1px solid var(--red)' : '1px solid var(--border)',
                  padding: '12px 0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {fmt}
              </button>
            ))}
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
                style={{
                  background: 'var(--red)',
                  color: '#fff',
                  border: '1px solid var(--red)',
                  padding: '12px 0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  textAlign: 'center',
                  minWidth: 0,
                  width: '100%'
                }}
              />
            ) : (
              <button
                onClick={() => { setIsCustom(true); setFormat(customOvers ? customOvers + ' Ov' : ''); }}
                style={{
                  background: 'var(--s1)',
                  color: 'var(--txt)',
                  border: '1px solid var(--border)',
                  padding: '12px 0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
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
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Team Size</div>
            <input 
              type="number"
              className="inp" 
              placeholder="11" 
              value={teamSize} 
              onChange={e => setTeamSize(e.target.value)} 
            />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Ball Type</div>
            <input 
              className="inp" 
              placeholder="Tennis" 
              value={ballType} 
              onChange={e => setBallType(e.target.value)} 
            />
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Date</div>
            <input 
              type="date"
              className="inp" 
              style={{ minWidth: 0 }}
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Time</div>
            <input 
              type="time"
              className="inp" 
              style={{ minWidth: 0 }}
              value={time} 
              onChange={e => setTime(e.target.value)} 
            />
          </div>
        </div>

        {/* Ground */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>Ground</div>
          <input 
            className="inp" 
            placeholder="Surat Cricket Ground" 
            value={ground} 
            onChange={e => setGround(e.target.value)} 
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <button
            className="btn btn-red btn-full"
            style={{ padding: '16px', fontSize: '16px', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (loading || !sessionName.trim()) ? 0.5 : 1 }}
            onClick={handleCreate}
            disabled={loading || !sessionName.trim()}
          >
            {loading ? 'Creating...' : <><span style={{ fontSize: '20px', fontWeight: 'normal' }}>+</span> Create & Get Code</>}
          </button>
          
          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--dim)', marginTop: '16px' }}>
            A unique 6-character code will be generated for players to join
          </div>
        </div>

      </div>
      <BottomNavigation />
    </div>
  );
}
