'use client';
import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import type { Player, Team } from '@/types/cricket';

interface ManageTeamsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  teams: Team[];
  matchId: string;
  code: string;
  onUpdate: () => void; // triggers a player reload
}

export default function ManageTeamsSheet({
  isOpen, onClose, players, teams, matchId, code, onUpdate,
}: ManageTeamsSheetProps) {
  const [saving, setSaving] = useState<string | null>(null);

  if (!isOpen) return null;

  const team1 = players.filter(p => p.team_id === teams[0]?.id);
  const team2 = players.filter(p => p.team_id === teams[1]?.id);
  const unassigned = players.filter(p => !p.team_id && !p.is_joker);
  const jokers = players.filter(p => p.is_joker);

  const doAction = async (action: string, data: Record<string, string>) => {
    const key = `${action}-${data.playerId}`;
    setSaving(key);
    try {
      await fetch(`/api/match/${code}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      onUpdate();
    } finally {
      setSaving(null);
    }
  };

  const removeFromTeam = (playerId: string) =>
    doAction('remove_player_from_team', { playerId });

  const assignToTeam = (playerId: string, teamId: string) =>
    doAction('assign_player', { playerId, teamId });

  const removeFromLobby = async (playerId: string) => {
    if (!confirm('Remove this player from the lobby? They can rejoin with the match code.')) return;
    doAction('remove_player', { playerId });
  };

  const TeamColumn = ({ team, teamPlayers, colorVar }: { team: Team; teamPlayers: Player[]; colorVar: string }) => (
    <div style={{
      flex: 1, background: 'var(--s2)', borderRadius: '12px', padding: '12px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorVar, flexShrink: 0 }} />
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
        <div style={{ fontSize: '11px', fontWeight: 700, background: 'var(--s3)', borderRadius: '6px', padding: '2px 7px', color: 'var(--muted)' }}>{teamPlayers.length}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {teamPlayers.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'var(--s1)', borderRadius: '8px', padding: '7px 8px',
            border: '1px solid var(--border)',
          }}>
            <Avatar name={p.name} size={22} />
            <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <button
              onClick={() => removeFromTeam(p.id)}
              disabled={saving === `remove_player_from_team-${p.id}`}
              style={{
                background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: '16px',
                cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', lineHeight: 1,
                opacity: saving === `remove_player_from_team-${p.id}` ? 0.4 : 1,
              }}
              title="Unassign from team"
            >
              ×
            </button>
          </div>
        ))}
        {teamPlayers.length === 0 && (
          <div style={{ fontSize: '11px', color: 'var(--dim)', textAlign: 'center', padding: '12px 4px', border: '1px dashed var(--dim)', borderRadius: '8px' }}>
            No players
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px', background: 'var(--s1)',
        border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0',
        zIndex: 101, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .25s ease',
      }}>
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'var(--dim)', borderRadius: '2px', margin: '14px auto 0' }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--txt)' }}>👥 Manage Teams</div>
          <button
            onClick={onClose}
            style={{ background: 'var(--s3)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', color: 'var(--muted)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px calc(16px + env(safe-area-inset-bottom,0px))' }}>

          {/* Team columns side by side */}
          {teams.length >= 2 ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <TeamColumn team={teams[0]} teamPlayers={team1} colorVar="var(--red)" />
              <TeamColumn team={teams[1]} teamPlayers={team2} colorVar="var(--blue)" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>No teams configured</div>
          )}

          {/* Jokers */}
          {jokers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Jokers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {jokers.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(139,92,246,.08)', borderRadius: '8px', padding: '7px 10px',
                    border: '1px solid rgba(139,92,246,.2)',
                  }}>
                    <Avatar name={p.name} size={22} />
                    <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, color: 'var(--purple)' }}>{p.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Joker</span>
                    {teams[0] && (
                      <button
                        onClick={() => assignToTeam(p.id, teams[0].id)}
                        style={{ background: 'rgba(227,27,35,.1)', border: '1px solid rgba(227,27,35,.2)', color: 'var(--red)', borderRadius: '6px', padding: '3px 7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >→ A</button>
                    )}
                    {teams[1] && (
                      <button
                        onClick={() => assignToTeam(p.id, teams[1].id)}
                        style={{ background: 'rgba(10,132,255,.1)', border: '1px solid rgba(10,132,255,.2)', color: 'var(--blue)', borderRadius: '6px', padding: '3px 7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >→ B</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned pool */}
          {unassigned.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>
                Unassigned ({unassigned.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {unassigned.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--s2)', borderRadius: '10px', padding: '9px 10px',
                    border: '1px solid var(--border)',
                  }}>
                    <Avatar name={p.name} size={28} />
                    <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>{p.name}</span>
                    {/* Assign to team buttons */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {teams[0] && (
                        <button
                          onClick={() => assignToTeam(p.id, teams[0].id)}
                          disabled={saving === `assign_player-${p.id}`}
                          style={{
                            background: 'rgba(227,27,35,.1)', border: '1px solid rgba(227,27,35,.2)', color: 'var(--red)',
                            borderRadius: '7px', padding: '5px 9px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            opacity: saving === `assign_player-${p.id}` ? 0.5 : 1,
                          }}
                        >→ {teams[0].name.slice(0, 6)}</button>
                      )}
                      {teams[1] && (
                        <button
                          onClick={() => assignToTeam(p.id, teams[1].id)}
                          disabled={saving === `assign_player-${p.id}`}
                          style={{
                            background: 'rgba(10,132,255,.1)', border: '1px solid rgba(10,132,255,.2)', color: 'var(--blue)',
                            borderRadius: '7px', padding: '5px 9px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            opacity: saving === `assign_player-${p.id}` ? 0.5 : 1,
                          }}
                        >→ {teams[1].name.slice(0, 6)}</button>
                      )}
                      <button
                        onClick={() => removeFromLobby(p.id)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '16px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px' }}
                        title="Remove from lobby"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unassigned.length === 0 && jokers.length === 0 && team1.length === 0 && team2.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              No players in this session yet
            </div>
          )}
        </div>
      </div>
    </>
  );
}
