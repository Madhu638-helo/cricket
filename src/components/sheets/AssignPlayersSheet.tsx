import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import type { Player, Team } from '@/types/cricket';

interface AssignPlayersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unassignedPlayers: Player[];
  teams: Team[];
  onAssign: (playerId: string, teamId: string) => void;
}

export default function AssignPlayersSheet({ isOpen, onClose, unassignedPlayers, teams, onAssign }: AssignPlayersSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s', touchAction: 'none' }}
      />
      <div 
        className="card"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
          padding: '20px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '85vh', overflowY: 'auto'
        }}
      >
        <div style={{ width: '40px', height: '4px', background: 'var(--border2)', borderRadius: '2px', margin: '0 auto 16px' }} />
        
        <h3 className="heading" style={{ fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
          Assign New Players
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '20px' }}>
          These players joined mid-game. Assign them to a team.
        </p>

        {unassignedPlayers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', padding: '20px' }}>
            All players have been assigned.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {unassignedPlayers.map(p => (
              <div key={p.id} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Avatar name={p.name} size={32} />
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {teams.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => onAssign(p.id, t.id)}
                      className="btn"
                      style={{ flex: 1, padding: '10px', fontSize: '13px', background: i === 0 ? 'var(--red)' : 'var(--blue)', color: '#fff', border: 'none' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-ghost btn-full" style={{ marginTop: '16px', padding: '14px' }} onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}
