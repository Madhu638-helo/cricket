'use client';
import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import type { Session, Team, Player } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

/* ────────────────────────────────────────────────────────
   Drag-and-drop lobby with three zones:
   • Team A column  • Team B column  • Unassigned pool
   Players can be dragged between zones (touch + mouse).
   Tapping a player in a team opens a role popover
   (Captain / Scorer / Joker).
   ──────────────────────────────────────────────────────── */

export default function LobbyPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [matchDate, setMatchDate] = useState<string | null>(null);
  const [matchTime, setMatchTime] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null); // player id being dragged
  const [dragOver, setDragOver] = useState<string | null>(null); // zone being hovered: 'team-0' | 'team-1' | 'unassigned'

  // Role popover
  const [roleTarget, setRoleTarget] = useState<Player | null>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // ── Load ──
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(({ user }) => {
      if (!user) router.push('/login');
      loadLobby(user?.id);
    }).catch(() => router.push('/login'));
  }, [code]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`lobby-${code}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `session_id=eq.${sessionId}`
      }, () => loadPlayers(sessionId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Close role popover on outside click
  useEffect(() => {
    if (!roleTarget) return;
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleTarget(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roleTarget]);

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

    const [{ data: t }, { data: p }, { data: matchData }] = await Promise.all([
      supabase.from('teams').select('*').eq('session_id', sess.id),
      supabase.from('players').select('*').eq('session_id', sess.id),
      supabase.from('matches').select('match_date,match_time').eq('session_id', sess.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setTeams(t ?? []);
    setPlayers(p ?? []);
    if (matchData) {
      setMatchDate(matchData.match_date ?? null);
      setMatchTime(matchData.match_time ?? null);
    }
    setLoading(false);

    try {
      const qr = await import('qrcode');
      const url = `${window.location.origin}/join?code=${sess.code}`;
      const dataUrl = await qr.toDataURL(url, { width: 180, margin: 1, color: { dark: '#E31B23', light: '#111' } });
      setQrCode(dataUrl);
    } catch { /* QR optional */ }
  };

  // ── Drag handlers ──
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    if (!isOwner) return;
    setDragging(playerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', playerId);
  };

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(zone);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = async (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    setDragOver(null);
    const playerId = e.dataTransfer.getData('text/plain') || dragging;
    setDragging(null);
    if (!playerId) return;

    if (zone === 'unassigned') {
      // Remove from team + joker
      await supabase.from('players').update({ team_id: null, is_joker: false, is_captain: false }).eq('id', playerId);
    } else if (zone.startsWith('team-')) {
      const idx = parseInt(zone.split('-')[1]);
      const teamId = teams[idx]?.id;
      if (teamId) {
        await supabase.from('players').update({ team_id: teamId, is_joker: false }).eq('id', playerId);
      }
    }
    if (sessionId) loadPlayers(sessionId);
  };

  // ── Touch drag (mobile) ──
  const touchDragRef = useRef<{ playerId: string; el: HTMLElement; ghost: HTMLElement | null; startX: number; startY: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, playerId: string) => {
    if (!isOwner) return;
    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    touchDragRef.current = { playerId, el, ghost: null, startX: touch.clientX, startY: touch.clientY };
  }, [isOwner]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const td = touchDragRef.current;
    if (!td) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - td.startX);
    const dy = Math.abs(touch.clientY - td.startY);
    if (dx < 8 && dy < 8 && !td.ghost) return; // not dragging yet

    e.preventDefault();

    if (!td.ghost) {
      // Create ghost
      setDragging(td.playerId);
      const ghost = td.el.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = '9999';
      ghost.style.width = td.el.offsetWidth + 'px';
      ghost.style.transform = 'scale(1.08)';
      ghost.style.boxShadow = '0 8px 32px rgba(0,0,0,.6)';
      document.body.appendChild(ghost);
      td.ghost = ghost;
    }

    td.ghost!.style.left = touch.clientX - td.el.offsetWidth / 2 + 'px';
    td.ghost!.style.top = touch.clientY - 24 + 'px';

    // Determine which zone we're over
    const zones = document.querySelectorAll<HTMLElement>('[data-drop-zone]');
    let overZone: string | null = null;
    zones.forEach(z => {
      const rect = z.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        overZone = z.dataset.dropZone ?? null;
      }
    });
    setDragOver(overZone);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    const td = touchDragRef.current;
    if (!td) return;

    if (td.ghost) {
      document.body.removeChild(td.ghost);
      // Perform drop
      if (dragOver) {
        if (dragOver === 'unassigned') {
          await supabase.from('players').update({ team_id: null, is_joker: false, is_captain: false }).eq('id', td.playerId);
        } else if (dragOver.startsWith('team-')) {
          const idx = parseInt(dragOver.split('-')[1]);
          const teamId = teams[idx]?.id;
          if (teamId) {
            await supabase.from('players').update({ team_id: teamId, is_joker: false }).eq('id', td.playerId);
          }
        }
        if (sessionId) loadPlayers(sessionId);
      }
    }

    touchDragRef.current = null;
    setDragging(null);
    setDragOver(null);
  }, [dragOver, teams, sessionId]);

  // ── Role actions ──
  const assignRole = async (playerId: string, role: 'scorer' | 'joker' | 'captain') => {
    const p = players.find(pl => pl.id === playerId);
    if (role === 'scorer') {
      await supabase.from('players').update({ is_scorer: !p?.is_scorer }).eq('id', playerId);
    } else if (role === 'joker') {
      await supabase.from('players').update({ is_joker: !p?.is_joker, is_captain: false }).eq('id', playerId);
    } else {
      await supabase.from('players').update({ is_captain: !p?.is_captain, is_joker: false }).eq('id', playerId);
    }
    setRoleTarget(null);
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
      navigator.clipboard.writeText(url).then(() => alert('Link copied!')).catch(console.error);
    } else {
      alert(`Copy this link: ${url}`);
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
  const canProceed = team1.length >= 2 && team2.length >= 2;

  const dropZoneStyle = (zone: string): React.CSSProperties => ({
    transition: 'background .15s, border-color .15s',
    background: dragOver === zone ? 'rgba(249,115,22,.08)' : 'transparent',
    borderColor: dragOver === zone ? 'rgba(249,115,22,.4)' : undefined,
    borderStyle: dragOver === zone ? 'dashed' : undefined,
  });

  const PlayerChip = ({ p, inTeam }: { p: Player; inTeam: boolean }) => (
    <div
      draggable={isOwner}
      onDragStart={e => handleDragStart(e, p.id)}
      onTouchStart={e => handleTouchStart(e, p.id)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (!isOwner || dragging) return;
        setRoleTarget(roleTarget?.id === p.id ? null : p);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: inTeam ? '8px 10px' : '8px 12px',
        borderRadius: '10px', cursor: isOwner ? 'grab' : 'default',
        background: dragging === p.id ? 'rgba(249,115,22,.15)' : roleTarget?.id === p.id ? 'rgba(227,27,35,.1)' : 'var(--s2)',
        border: `1px solid ${dragging === p.id ? 'rgba(249,115,22,.4)' : roleTarget?.id === p.id ? 'rgba(227,27,35,.25)' : 'var(--border)'}`,
        opacity: dragging === p.id ? 0.5 : 1,
        transition: 'all .15s',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Avatar name={p.name} size={inTeam ? 26 : 34} />
      <span style={{ fontSize: inTeam ? '12px' : '13px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      {p.is_captain && <Badge variant="cap">C</Badge>}
      {p.is_scorer && <Badge variant="scorer">S</Badge>}
      {p.is_joker && <Badge variant="joker">🃏</Badge>}
    </div>
  );

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
            <b>Drag & Drop</b> players to assign teams. Tap a player in a team to set Captain, Scorer, or Joker.
          </div>
        )}

        {team1.length !== team2.length && jokers.length === 0 && (
          <div style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#c4b5fd' }}>
            <b>Teams are uneven!</b> Select a Joker player who can bat & bowl for both teams.
          </div>
        )}

        {/* Teams grid — drop zones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {teams.map((team, idx) => {
            const teamPlayers = idx === 0 ? team1 : team2;
            const zone = `team-${idx}`;
            return (
              <div
                key={team.id}
                className="card"
                data-drop-zone={zone}
                onDragOver={e => handleDragOver(e, zone)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, zone)}
                style={{ padding: '12px', minHeight: '120px', ...dropZoneStyle(zone) }}
              >
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
                  <Badge variant="none">{teamPlayers.length}</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                  {teamPlayers.map(p => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <PlayerChip p={p} inTeam />
                      {/* Role popover */}
                      {roleTarget?.id === p.id && isOwner && (
                        <div
                          ref={roleRef}
                          style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                            background: 'var(--s2)', border: '1px solid var(--border2)', borderRadius: '12px',
                            overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
                          }}
                        >
                          <button
                            onClick={() => assignRole(p.id, 'captain')}
                            style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: p.is_captain ? 'var(--live)' : '#facc15', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            👑 {p.is_captain ? 'Remove Captain' : 'Make Captain'}
                          </button>
                          <button
                            onClick={() => assignRole(p.id, 'scorer')}
                            style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: p.is_scorer ? 'var(--live)' : 'var(--blue)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            🎙️ {p.is_scorer ? 'Remove Scorer' : 'Make Scorer'}
                          </button>
                          <button
                            onClick={() => assignRole(p.id, 'joker')}
                            style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: p.is_joker ? 'var(--live)' : '#c4b5fd', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            🃏 {p.is_joker ? 'Remove Joker' : 'Make Joker'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {teamPlayers.length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--dim)', textAlign: 'center', padding: '16px 8px', border: '1px dashed var(--dim)', borderRadius: '10px' }}>
                      Drop players here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

        {/* Unassigned pool — drop zone */}
        <div
          data-drop-zone="unassigned"
          onDragOver={e => handleDragOver(e, 'unassigned')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'unassigned')}
          style={{
            minHeight: unassigned.length === 0 && !dragging ? '0' : '60px',
            borderRadius: '14px', padding: unassigned.length > 0 || dragging ? '12px' : '0',
            border: dragging ? '2px dashed var(--dim)' : 'none',
            ...dropZoneStyle('unassigned'),
          }}
        >
          {(unassigned.length > 0 || dragging) && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>
              {unassigned.length > 0 ? `Unassigned (${unassigned.length})` : 'Drop here to unassign'}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unassigned.map(p => (
              <div key={p.id} style={{ minWidth: '80px', flex: '0 0 auto', position: 'relative' }}>
                <PlayerChip p={p} inTeam={false} />
                {/* Joker popover for unassigned players */}
                {roleTarget?.id === p.id && isOwner && (
                  <div
                    ref={roleRef}
                    style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                      background: 'var(--s2)', border: '1px solid var(--border2)', borderRadius: '12px',
                      overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
                      minWidth: '150px',
                    }}
                  >
                    <button
                      onClick={() => assignRole(p.id, 'joker')}
                      style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#c4b5fd', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      🃏 Make Joker
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isOwner && (() => {
            let canStart = canProceed;
            let dateMsg = '';
            if (matchDate) {
              const today = new Date();
              const mDate = new Date(matchDate);
              const todayStr = today.toISOString().slice(0, 10);
              const matchStr = mDate.toISOString().slice(0, 10);
              if (todayStr < matchStr) {
                canStart = false;
                dateMsg = `Match scheduled for ${mDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}`;
              }
            }
            return (
              <>
                <button
                  className="btn btn-red btn-full"
                  style={{ padding: '15px', fontSize: '15px', opacity: canStart ? 1 : 0.4 }}
                  disabled={!canStart}
                  onClick={() => router.push(`/match/${code}/toss`)}
                >
                  Proceed to Toss →
                </button>
                {dateMsg && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#fcd34d', fontFamily: 'Barlow, sans-serif', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: '10px', padding: '8px 14px' }}>
                    📅 {dateMsg}
                  </div>
                )}
              </>
            );
          })()}
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
