'use client';
import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, useSensor, useSensors,
  MouseSensor, TouchSensor, closestCenter, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import type { Session, Team, Player } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

// ── Droppable Zone ──────────────────────────────────────────
function DroppableZone({ id, children, style }: { id: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      ...style,
      transition: 'background .15s, border-color .15s',
      background: isOver ? 'rgba(249,115,22,.08)' : (style?.background ?? 'transparent'),
      borderColor: isOver ? 'rgba(249,115,22,.4)' : undefined,
      borderStyle: isOver ? 'dashed' : (style?.borderStyle ?? undefined),
    }}>
      {children}
    </div>
  );
}

// ── Draggable Player Chip ───────────────────────────────────
function DraggablePlayerChip({
  p, inTeam, isOwner, onTapChip, isActive,
}: {
  p: Player; inTeam: boolean; isOwner: boolean;
  onTapChip: () => void; isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: !isOwner });

  return (
    <div
      ref={setNodeRef}
      onClick={onTapChip}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: inTeam ? '8px 10px' : '8px 12px',
        borderRadius: '10px',
        background: isDragging ? 'rgba(249,115,22,.15)' : isActive ? 'rgba(227,27,35,.1)' : 'var(--s2)',
        border: `1px solid ${isDragging ? 'rgba(249,115,22,.4)' : isActive ? 'rgba(227,27,35,.25)' : 'var(--border)'}`,
        opacity: isDragging ? 0.4 : 1,
        transition: 'all .15s',
        userSelect: 'none',
        cursor: isOwner ? 'pointer' : 'default',
      }}
    >
      {/* Drag handle — only for owner */}
      {isOwner && (
        <div
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()} // prevent tap-to-open-popover when dragging
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '20px', height: '32px', cursor: 'grab', color: 'var(--dim)',
            fontSize: '14px', flexShrink: 0,
            touchAction: 'none', // critical for dnd-kit on iOS
          }}
        >
          ⠿
        </div>
      )}
      <Avatar name={p.name} size={inTeam ? 26 : 34} />
      <span style={{ fontSize: inTeam ? '12px' : '13px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.name}
      </span>
      {p.is_captain && <Badge variant="cap">C</Badge>}
      {p.is_scorer && <Badge variant="scorer">S</Badge>}
      {p.is_joker && <Badge variant="joker">🃏</Badge>}
    </div>
  );
}

// ── Ghost chip shown while dragging ───────────────────────
function GhostChip({ p }: { p: Player }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderRadius: '10px',
      background: 'rgba(249,115,22,.2)', border: '1px solid rgba(249,115,22,.5)',
      boxShadow: '0 8px 32px rgba(0,0,0,.7)', opacity: 0.92,
      transform: 'scale(1.05)', pointerEvents: 'none',
    }}>
      <Avatar name={p.name} size={28} />
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)' }}>{p.name}</span>
    </div>
  );
}

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
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchOvers, setMatchOvers] = useState<number>(6);
  const [sessionName, setSessionName] = useState('');
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  // Match details edit
  const [showDetailsEdit, setShowDetailsEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editOvers, setEditOvers] = useState(6);
  const [savingDetails, setSavingDetails] = useState(false);

  // Role popover
  const [roleTarget, setRoleTarget] = useState<Player | null>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Active drag
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── dnd-kit sensors ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
  );

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
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'teams',
        filter: `session_id=eq.${sessionId}`
      }, async () => {
        const { data: t } = await supabase.from('teams').select('*').eq('session_id', sessionId);
        setTeams(t ?? []);
      })
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
    setSessionName(sess.name ?? '');
    setIsOwner(userId === sess.owner_id);

    const [{ data: t }, { data: p }, { data: matchData }] = await Promise.all([
      supabase.from('teams').select('*').eq('session_id', sess.id),
      supabase.from('players').select('*').eq('session_id', sess.id),
      supabase.from('matches').select('id,match_date,match_time,overs').eq('session_id', sess.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setTeams(t ?? []);
    setPlayers(p ?? []);
    if (matchData) {
      setMatchId(matchData.id ?? null);
      setMatchDate(matchData.match_date ?? null);
      setMatchTime(matchData.match_time ?? null);
      setMatchOvers(matchData.overs ?? 6);
      setEditDate(matchData.match_date ?? '');
      setEditTime(matchData.match_time ?? '');
      setEditOvers(matchData.overs ?? 6);
    }
    setEditName(sess.name ?? '');
    setLoading(false);

    try {
      const qr = await import('qrcode');
      const url = `${window.location.origin}/join?code=${sess.code}`;
      const dataUrl = await qr.toDataURL(url, { width: 180, margin: 1, color: { dark: '#E31B23', light: '#111' } });
      setQrCode(dataUrl);
    } catch { /* QR optional */ }
  };

  // ── dnd-kit handlers ──
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setRoleTarget(null); // close any open popover
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id as string;
    const zone = over.id as string;

    if (zone === 'unassigned') {
      await supabase.from('players').update({ team_id: null, is_joker: false, is_captain: false }).eq('id', playerId);
    } else if (zone.startsWith('team-')) {
      const idx = parseInt(zone.split('-')[1]);
      const teamId = teams[idx]?.id;
      if (teamId) {
        await supabase.from('players').update({ team_id: teamId, is_joker: false }).eq('id', playerId);
      }
    }
    if (sessionId) loadPlayers(sessionId);
  }, [teams, sessionId]);

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

  const removePlayerFromTeam = async (playerId: string) => {
    setRoleTarget(null);
    await fetch(`/api/match/${code}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_player_from_team', data: { playerId } }),
    });
    if (sessionId) loadPlayers(sessionId);
  };

  const removePlayerFromLobby = async (playerId: string) => {
    setRoleTarget(null);
    if (!confirm('Remove this player from the lobby entirely? They can rejoin with the match code.')) return;
    await fetch(`/api/match/${code}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_player', data: { playerId } }),
    });
    if (sessionId) loadPlayers(sessionId);
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  };
  const saveTeamName = async (teamId: string, name: string) => {
    await supabase.from('teams').update({ name }).eq('id', teamId);
  };

  const saveMatchDateTime = async () => {
    if (!matchId) return;
    setSavingDate(true);
    try {
      await fetch(`/api/match/${code}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_match_schedule',
          data: { matchId, matchDate: editDate || null, matchTime: editTime || null }
        }),
      });
      setMatchDate(editDate || null);
      setMatchTime(editTime || null);
    } catch (e) {
      console.error(e);
    }
    setSavingDate(false);
    setShowDateEdit(false);
  };

  const saveMatchDetails = async () => {
    setSavingDetails(true);
    await fetch(`/api/match/${code}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_match_details',
        data: { matchId, overs: editOvers, sessionName: editName },
      }),
    });
    setSessionName(editName);
    setMatchOvers(editOvers);
    setSession(s => s ? { ...s, name: editName } : s);
    setSavingDetails(false);
    setShowDetailsEdit(false);
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
  const activeDragPlayer = activeDragId ? players.find(p => p.id === activeDragId) : null;

  // Role popover for a player

  const RolePopover = ({ p }: { p: Player }) => (
    <div
      ref={roleRef}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
        background: 'var(--s2)', border: '1px solid var(--border2)', borderRadius: '12px',
        overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        minWidth: '160px',
      }}
    >
      {p.team_id && (
        <button
          onClick={() => assignRole(p.id, 'captain')}
          style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: p.is_captain ? 'var(--live)' : 'var(--gold)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          👑 {p.is_captain ? 'Remove Captain' : 'Make Captain'}
        </button>
      )}
      {p.team_id && (
        <button
          onClick={() => assignRole(p.id, 'scorer')}
          style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: p.is_scorer ? 'var(--live)' : 'var(--blue)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          🎙️ {p.is_scorer ? 'Remove Scorer' : 'Make Scorer'}
        </button>
      )}
      <button
        onClick={() => assignRole(p.id, 'joker')}
        style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: p.is_joker ? 'var(--live)' : 'var(--purple)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        🃏 {p.is_joker ? 'Remove Joker' : 'Make Joker'}
      </button>
      {p.team_id && (
        <button
          onClick={() => removePlayerFromTeam(p.id)}
          style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ↩ Unassign from Team
        </button>
      )}
      <button
        onClick={() => removePlayerFromLobby(p.id)}
        style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#f87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        🗑 Remove from Lobby
      </button>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--dim)' }}>· {matchOvers} overs</span>
              </div>
              {qrCode && <img src={qrCode} alt="QR" style={{ width: '48px', borderRadius: '6px' }} />}
            </div>
            <ProgressBar value={pct} />
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {isOwner && (
            <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: 'var(--gold)' }}>
              <b>Drag ⠿ handle</b> to assign teams · <b>Tap chip</b> to set role or remove
            </div>
          )}

          {team1.length !== team2.length && jokers.length === 0 && (
            <div style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: 'var(--purple)' }}>
              <b>Teams are uneven!</b> Select a Joker player who can bat &amp; bowl for both teams.
            </div>
          )}

          {/* Teams grid — drop zones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {teams.map((team, idx) => {
              const teamPlayers = idx === 0 ? team1 : team2;
              const zone = `team-${idx}`;
              return (
                <DroppableZone
                  key={team.id}
                  id={zone}
                  style={{
                    padding: '12px', minHeight: '120px', minWidth: 0,
                    background: 'var(--s1)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === 0 ? 'var(--red)' : 'var(--blue)', flexShrink: 0 }} />
                    {isOwner ? (
                      <input
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        onBlur={(e) => saveTeamName(team.id, e.target.value)}
                        style={{ background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--txt)', outline: 'none', width: '100%', minWidth: 0 }}
                      />
                    ) : (
                      <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
                    )}
                    <Badge variant="none">{teamPlayers.length}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                    {teamPlayers.map(p => (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <DraggablePlayerChip
                          p={p}
                          inTeam
                          isOwner={isOwner}
                          isActive={roleTarget?.id === p.id}
                          onTapChip={() => {
                            if (!isOwner || activeDragId) return;
                            setRoleTarget(roleTarget?.id === p.id ? null : p);
                          }}
                        />
                        {roleTarget?.id === p.id && isOwner && <RolePopover p={p} />}
                      </div>
                    ))}
                    {teamPlayers.length === 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--dim)', textAlign: 'center', padding: '16px 8px', border: '1px dashed var(--dim)', borderRadius: '10px' }}>
                        Drop players here
                      </div>
                    )}
                  </div>
                </DroppableZone>
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
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Can bat &amp; bowl for either team</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {jokers.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '20px', padding: '3px 10px' }}>
                    <Avatar name={p.name} size={18} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple)' }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned pool — drop zone */}
          <DroppableZone
            id="unassigned"
            style={{
              minHeight: unassigned.length === 0 && !activeDragId ? '0' : '60px',
              borderRadius: '14px',
              padding: unassigned.length > 0 || activeDragId ? '12px' : '0',
              borderWidth: activeDragId ? '2px' : '0px',
              borderStyle: activeDragId ? 'dashed' : 'solid',
              borderColor: activeDragId ? 'var(--dim)' : 'transparent',
            }}
          >
            {(unassigned.length > 0 || activeDragId) && (
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>
                {unassigned.length > 0 ? `Unassigned (${unassigned.length})` : 'Drop here to unassign'}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {unassigned.map(p => (
                <div key={p.id} style={{ minWidth: '80px', flex: '0 0 auto', position: 'relative' }}>
                  <DraggablePlayerChip
                    p={p}
                    inTeam={false}
                    isOwner={isOwner}
                    isActive={roleTarget?.id === p.id}
                    onTapChip={() => {
                      if (!isOwner || activeDragId) return;
                      setRoleTarget(roleTarget?.id === p.id ? null : p);
                    }}
                  />
                  {roleTarget?.id === p.id && isOwner && <RolePopover p={p} />}
                </div>
              ))}
            </div>
          </DroppableZone>

          {/* Match Details Card (owner only) */}
          {isOwner && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDetailsEdit ? '12px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📋</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Match Details</div>
                    {!showDetailsEdit && (
                      <div style={{ fontSize: '13px', color: 'var(--txt)', marginTop: '2px' }}>
                        {sessionName || code} · <span style={{ color: 'var(--live)' }}>{matchOvers} overs</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setShowDetailsEdit(!showDetailsEdit); setEditName(sessionName); setEditOvers(matchOvers); }}
                  style={{ background: showDetailsEdit ? 'rgba(239,68,68,.1)' : 'var(--s2)', border: `1px solid ${showDetailsEdit ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, color: showDetailsEdit ? 'var(--red)' : 'var(--muted)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {showDetailsEdit ? 'Cancel' : '✏️ Edit'}
                </button>
              </div>

              {showDetailsEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Match name */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Match Name</div>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="e.g. Sunday League Finals"
                      className="inp"
                      style={{ fontSize: '14px', padding: '10px' }}
                    />
                  </div>

                  {/* Overs */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Overs per Innings</div>
                    <input
                      type="number"
                      value={editOvers}
                      onChange={e => setEditOvers(Number(e.target.value))}
                      min={1}
                      max={200}
                      className="inp"
                      style={{ fontSize: '14px', padding: '10px', width: '100px' }}
                    />
                  </div>

                  <button
                    onClick={saveMatchDetails}
                    disabled={savingDetails}
                    className="btn btn-red"
                    style={{ padding: '10px', fontSize: '13px', opacity: savingDetails ? 0.6 : 1 }}
                  >
                    {savingDetails ? 'Saving…' : '✓ Save Details'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Date / Time Card */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDateEdit ? '12px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Match Schedule</div>
                  {matchDate ? (
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--txt)', marginTop: '2px' }}>
                      {new Date(matchDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      {matchTime && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {matchTime}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--dim)', marginTop: '2px' }}>No date set</div>
                  )}
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => { setShowDateEdit(!showDateEdit); setEditDate(matchDate ?? ''); setEditTime(matchTime ?? ''); }}
                  style={{ background: showDateEdit ? 'rgba(239,68,68,.1)' : 'var(--s2)', border: `1px solid ${showDateEdit ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, color: showDateEdit ? 'var(--red)' : 'var(--muted)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {showDateEdit ? 'Cancel' : '✏️ Edit'}
                </button>
              )}
            </div>

            {isOwner && showDateEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Date</div>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="inp" style={{ fontSize: '14px', padding: '10px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Time</div>
                    <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="inp" style={{ fontSize: '14px', padding: '10px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={saveMatchDateTime} disabled={savingDate} className="btn btn-red" style={{ flex: 1, padding: '10px', fontSize: '13px', opacity: savingDate ? 0.6 : 1 }}>
                    {savingDate ? 'Saving…' : '✓ Save Schedule'}
                  </button>
                  {(matchDate || matchTime) && (
                    <button
                      onClick={async () => {
                        setEditDate(''); setEditTime('');
                        await fetch(`/api/match/${code}/action`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'update_match_schedule', data: { matchId, matchDate: null, matchTime: null } }),
                        });
                        setMatchDate(null); setMatchTime(null);
                        setShowDateEdit(false);
                      }}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
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
                  dateMsg = `Scheduled for ${mDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}${matchTime ? ' at ' + matchTime : ''}`;
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
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--gold)', fontFamily: 'Barlow, sans-serif', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: '10px', padding: '8px 14px' }}>
                      🕐 {dateMsg}
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

      {/* DragOverlay — renders the floating ghost during drag */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeDragPlayer ? <GhostChip p={activeDragPlayer} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
