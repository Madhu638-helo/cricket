'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Player, Team } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

export default function SetupPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [battingTeamId, setBattingTeamId] = useState('');
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.from('sessions').select('*, teams(*)').eq('code', code).single();
      if (!sess) return;
      const { data: match } = await supabase.from('matches').select('*').eq('session_id', sess.id).order('created_at', { ascending: false }).limit(1).single();
      const { data: p } = await supabase.from('players').select('*').eq('session_id', sess.id);
      setTeams(sess.teams ?? []);
      setPlayers(p ?? []);
      if (match) {
        setMatchId(match.id);
        setBattingTeamId(match.batting_first ?? '');
      }
    };
    load();
  }, [code]);

  const battingPlayers = [...players.filter(p => p.team_id === battingTeamId && !p.is_joker), ...players.filter(p => p.is_joker)];
  const bowlingTeamId = teams.find(t => t.id !== battingTeamId)?.id ?? '';
  const bowlingPlayers = [...players.filter(p => p.team_id === bowlingTeamId && !p.is_joker), ...players.filter(p => p.is_joker)];
  const battingTeamName = teams.find(t => t.id === battingTeamId)?.name ?? 'Batting Team';
  const bowlingTeamName = teams.find(t => t.id === bowlingTeamId)?.name ?? 'Bowling Team';

  const startMatch = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) return;
    setLoading(true);
    const res = await fetch(`/api/match/${code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_innings_1',
        data: { matchId, battingTeamId, opener1Id: strikerId, opener2Id: nonStrikerId, bowlerId },
      }),
    });
    if (res.ok) {
      router.push(`/match/${code}`);
    }
    setLoading(false);
  };

  return (
    <div id="s-setup" className="screen">
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }} onClick={() => router.back()}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="heading" style={{ fontSize: '20px' }}>Opening Players</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Toss Result Graphic */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
          <img src="/toss_coin.png" alt="Toss Coin" style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6))' }} />
          <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 800, color: 'var(--live)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {battingTeamName} won the toss
          </div>
        </div>

        {/* Batting team */}
        <div className="card" style={{ padding: '14px', borderColor: 'rgba(227,27,35,.15)' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', textAlign: 'center' }}>
            ⚡ They will bat first
          </div>

          <div>
            <div className="label">Striker (Opening Batsman)</div>
            <select
              className="inp"
              value={strikerId}
              onChange={e => setStrikerId(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select striker…</option>
              {battingPlayers.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>{p.name}{p.is_joker ? ' 🃏' : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div className="label">Non-Striker</div>
            <select
              className="inp"
              value={nonStrikerId}
              onChange={e => setNonStrikerId(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select non-striker…</option>
              {battingPlayers.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === strikerId}>{p.name}{p.is_joker ? ' 🃏' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bowling team */}
        <div className="card" style={{ padding: '14px' }}>
          <div>
            <div className="label">Opening Bowler ({bowlingTeamName})</div>
            <select
              className="inp"
              value={bowlerId}
              onChange={e => setBowlerId(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Select bowler…</option>
              {bowlingPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.is_joker ? ' 🃏' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {strikerId && nonStrikerId && bowlerId && (
          <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.15)', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#86efac' }}>
            Ready! <b>{players.find(p => p.id === strikerId)?.name}</b> vs <b>{players.find(p => p.id === bowlerId)?.name}</b>
          </div>
        )}

        <button
          className="btn btn-red btn-full"
          style={{ padding: '15px', fontSize: '15px', opacity: (strikerId && nonStrikerId && bowlerId) ? 1 : 0.4 }}
          disabled={!strikerId || !nonStrikerId || !bowlerId || loading}
          onClick={startMatch}
        >
          {loading ? 'Starting…' : 'Start Match →'}
        </button>
      </div>
    </div>
  );
}
