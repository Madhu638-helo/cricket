'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import type { Session, Team, Player } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

export default function LobbyPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // Fetch auth once — not on every realtime event
    fetch('/api/auth/me').then(r => r.json()).then(({ user }) => {
      if (!user) router.push('/login');
      loadLobby(user?.id);
    }).catch(() => router.push('/login'));
  }, [code]);

  useEffect(() => {
    if (!sessionId) return;
    // Filter realtime to this session only
    const channel = supabase
      .channel(`lobby-${code}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `session_id=eq.${sessionId}`
      }, () => loadPlayers(sessionId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const loadPlayers = async (sid: string) => {
    const { data: p } = await supabase.from('players').select('*').eq('session_id', sid);
    setPlayers(p ?? []);
  };

  const loadLobby = async (userId?: string) => {
    const { data: sess } = await supabase.from('sessions').select('id,code,name,status,owner_id').eq('code', code).single();
    if (!sess) { router.push('/'); return; }
    setSession(sess);
    setSessionId(sess.id);
    setIsOwner(userId === sess.owner_id);

    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('teams').select('*').eq('session_id', sess.id),
      supabase.from('players').select('*').eq('session_id', sess.id),
    ]);
    setTeams(t ?? []);
    setPlayers(p ?? []);
    setLoading(false);

    // QR code
    try {
      const qr = await import('qrcode');
      const url = `${window.location.origin}/join?code=${sess.code}`;
      const dataUrl = await qr.toDataURL(url, { width: 180, margin: 1, color: { dark: '#E31B23', light: '#111' } });
      setQrCode(dataUrl);
    } catch { /* QR optional */ }
  };

  const assignTeam = async (playerId: string, teamId: string) => {
    await supabase.from('players').update({ team_id: teamId }).eq('id', playerId);
    setSelectedPlayer(null);
    if (sessionId) loadPlayers(sessionId);
  };

  const assignRole = async (playerId: string, role: 'scorer' | 'joker') => {
    const p = players.find(pl => pl.id === playerId);
    if (role === 'scorer') {
      await supabase.from('players').update({ is_scorer: !p?.is_scorer }).eq('id', playerId);
    } else {
      await supabase.from('players').update({ is_joker: !p?.is_joker, is_captain: false }).eq('id', playerId);
    }
    setSelectedPlayer(null);
    if (sessionId) loadPlayers(sessionId);
  };

  const assignCaptain = async (playerId: string) => {
    const p = players.find(pl => pl.id === playerId);
    await supabase.from('players').update({ is_captain: !p?.is_captain, is_joker: false }).eq('id', playerId);
    setSelectedPlayer(null);
    if (sessionId) loadPlayers(sessionId);
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  };

  const saveTeamName = async (teamId: string, name: string) => {
    await supabase.from('teams').update({ name }).eq('id', teamId);
  };

  const shareLink = () => {
    const url = `${window.location.origin}/join?code=${code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Match', text: `Join with code ${code}`, url }).catch(console.error);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => alert('Link copied to clipboard!')).catch(console.error);
    } else {
      try {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Link copied to clipboard!');
      } catch (err) {
        alert(`Copy this link: ${url}`);
      }
    }
  };

  if (loading) return (
    <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏟️</div>
        <p style={{ color: 'var(--muted)' }}>Loading lobby…</p>
      </div>
    </div>
  );

  const team1 = players.filter(p => p.team_id === teams[0]?.id);
  const team2 = players.filter(p => p.team_id === teams[1]?.id);
  const jokers = players.filter(p => p.is_joker);
  const unassigned = players.filter(p => !p.team_id && !p.is_joker);
  const totalExpected = (teams[0] ? 11 : 0) + (teams[1] ? 11 : 0);
  const pct = totalExpected > 0 ? Math.min(100, (players.length / totalExpected) * 100) : 0;
  // Both teams need at least 2 players each to proceed
  const canProceed = team1.length >= 2 && team2.length >= 2;

  return (
    <div id="s-lobby" className="screen">
      {/* Header */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }} onClick={() => router.back()}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="heading" style={{ fontSize: '18px' }}>{session?.name ?? code}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Match Lobby</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '4px', color: 'var(--red)' }}>{code}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Match Code</div>
          </div>
        </div>
        {/* Player count progress */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--s2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
              <b style={{ color: 'var(--txt)', fontSize: '16px' }}>{players.length}</b> players joined
            </div>
            {qrCode && <img src={qrCode} alt="QR" style={{ width: '48px', borderRadius: '6px' }} />}
          </div>
          <ProgressBar value={pct} />
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {isOwner && (
          <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#fcd34d' }}>
            <b>Admin:</b> Tap a player below to assign team, scorer, captain, or joker role.
          </div>
        )}

        {team1.length !== team2.length && jokers.length === 0 && (
          <div style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#c4b5fd' }}>
            <b>Teams are uneven!</b> Select a Joker player who can bat & bowl for both teams.
          </div>
        )}

        {/* Teams grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {teams.map((team, idx) => (
            <div key={team.id} className="card" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === 0 ? 'var(--red)' : 'var(--blue)', flexShrink: 0 }} />
                {isOwner ? (
                  <input
                    value={team.name}
                    onChange={(e) => updateTeamName(team.id, e.target.value)}
                    onBlur={(e) => saveTeamName(team.id, e.target.value)}
                    style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--txt)', outline: 'none', width: '100%' }}
                  />
                ) : (
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{team.name}</div>
                )}
                <Badge variant="none">{(idx === 0 ? team1 : team2).length}</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(idx === 0 ? team1 : team2).map(p => (
                  <div
                    key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', borderRadius: '8px', cursor: isOwner ? 'pointer' : undefined, background: selectedPlayer?.id === p.id ? 'var(--red-lo)' : 'var(--s2)' }}
                    onClick={() => isOwner && setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                  >
                    <Avatar name={p.name} size={24} />
                    <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {p.is_captain && <Badge variant="cap">C</Badge>}
                    {p.is_scorer && <Badge variant="scorer">S</Badge>}
                    {p.is_joker && <Badge variant="joker">🃏</Badge>}
                  </div>
                ))}
                {(idx === 0 ? team1 : team2).length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--dim)', textAlign: 'center', padding: '8px' }}>No players yet</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Joker section */}
        {jokers.length > 0 && (
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '20px' }}>🃏</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Joker Players</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Can bat & bowl for either team</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {jokers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '20px', padding: '3px 10px' }}>
                  <Avatar name={p.name} size={18} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#c4b5fd' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned players */}
        {unassigned.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
              Waiting / Unassigned ({unassigned.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {unassigned.map(p => (
                <div
                  key={p.id}
                  className={`lobby-player${selectedPlayer?.id === p.id ? ' sel' : ''}`}
                  onClick={() => isOwner && setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                  style={{ minWidth: '60px' }}
                >
                  <Avatar name={p.name} size={40} />
                  <div className="pname">{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player action sheet */}
        {selectedPlayer && isOwner && (
          <div className="card" style={{ padding: '16px', borderColor: 'rgba(227,27,35,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Avatar name={selectedPlayer.name} size={36} />
              <div className="heading" style={{ fontSize: '15px' }}>{selectedPlayer.name}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teams.map(t => (
                <button key={t.id} className="btn btn-ghost btn-full" style={{ padding: '10px', fontSize: '13px' }} onClick={() => assignTeam(selectedPlayer.id, t.id)}>
                  → Assign to {t.name}
                </button>
              ))}
              <button className="btn btn-ghost btn-full" style={{ padding: '10px', fontSize: '13px' }} onClick={() => assignRole(selectedPlayer.id, 'scorer')}>
                {selectedPlayer.is_scorer ? '✓ Remove Scorer' : '🎙️ Make Scorer'}
              </button>
              
              {!selectedPlayer.is_joker && selectedPlayer.team_id && (
                <button className="btn btn-ghost btn-full" style={{ padding: '10px', fontSize: '13px', color: '#facc15' }} onClick={() => assignCaptain(selectedPlayer.id)}>
                  {selectedPlayer.is_captain ? '✓ Remove Captain' : '👑 Make Captain'}
                </button>
              )}

              {!selectedPlayer.is_captain && (
                <button className="btn btn-ghost btn-full" style={{ padding: '10px', fontSize: '13px' }} onClick={() => assignRole(selectedPlayer.id, 'joker')}>
                  {selectedPlayer.is_joker ? '✓ Remove Joker' : '🃏 Make Joker'}
                </button>
              )}
              <button className="btn btn-ghost btn-full" style={{ padding: '8px', fontSize: '12px', color: 'var(--muted)' }} onClick={() => setSelectedPlayer(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isOwner && (
            <button
              className="btn btn-red btn-full"
              style={{ padding: '15px', fontSize: '15px', opacity: canProceed ? 1 : 0.4 }}
              disabled={!canProceed}
              onClick={() => router.push(`/match/${code}/toss`)}
            >
              Proceed to Toss →
            </button>
          )}
          <button className="btn btn-ghost btn-full" style={{ padding: '12px', fontSize: '13px' }} onClick={shareLink}>
            Share Join Link
          </button>
          {qrCode && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <img src={qrCode} alt="QR Code" style={{ width: '140px', borderRadius: '12px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginTop: '8px' }}>Scan to join match</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
