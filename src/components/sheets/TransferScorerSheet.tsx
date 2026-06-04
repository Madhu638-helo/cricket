import React from 'react';
import Avatar from '../ui/Avatar';
import type { Player } from '@/types/cricket';

interface TransferScorerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  teamPlayers: Player[];
  currentScorerId: string;
  onTransfer: (newScorerId: string) => void;
}

export default function TransferScorerSheet({ isOpen, onClose, teamPlayers, currentScorerId, onTransfer }: TransferScorerSheetProps) {
  if (!isOpen) return null;

  const eligiblePlayers = teamPlayers.filter(p => p.id !== currentScorerId);

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
          maxHeight: '80vh', overflowY: 'auto'
        }}
      >
        <div style={{ width: '40px', height: '4px', background: 'var(--border2)', borderRadius: '2px', margin: '0 auto 16px' }} />
        
        <h3 className="heading" style={{ fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
          Transfer Scorer Role
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '20px' }}>
          Hand over the scoring responsibility to a teammate. You will no longer be able to log scores.
        </p>

        {eligiblePlayers.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', padding: '20px' }}>
            No other players in your team to transfer to.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eligiblePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => onTransfer(p.id)}
                className="btn btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', justifyContent: 'flex-start', background: 'var(--s1)', border: '1px solid var(--border)' }}
              >
                <Avatar name={p.name} size={32} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn-ghost btn-full" style={{ marginTop: '16px', padding: '14px' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}
