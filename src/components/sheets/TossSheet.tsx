'use client';
import React, { useState } from 'react';
import { Sheet } from './Sheet';
import type { Team } from '@/types/cricket';

interface TossSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (winnerId: string, decision: 'bat' | 'bowl') => void;
  team1: Team;
  team2: Team;
}

export default function TossSheet({ open, onClose, onConfirm, team1, team2 }: TossSheetProps) {
  const [winnerId, setWinnerId] = useState('');
  const [decision, setDecision] = useState<'bat' | 'bowl' | ''>('');

  const handleConfirm = () => {
    if (!winnerId || !decision) return;
    onConfirm(winnerId, decision);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="🪙 Toss">
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 'var(--sp-4)', paddingLeft: 'var(--sp-1)' }}>
        Who won the toss?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
        {[team1, team2].map(team => (
          <button
            key={team.id}
            className={`sheet-option ${winnerId === team.id ? 'selected' : ''}`}
            onClick={() => setWinnerId(team.id)}
          >
            {winnerId === team.id ? '✅' : '⭕'} {team.name}
          </button>
        ))}
      </div>

      {winnerId && (
        <>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 'var(--sp-3)', paddingLeft: 'var(--sp-1)' }}>
            Elected to…
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <button
              className={`btn btn-full ${decision === 'bat' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDecision('bat')}
            >
              🏏 Bat
            </button>
            <button
              className={`btn btn-full ${decision === 'bowl' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDecision('bowl')}
            >
              🎳 Bowl
            </button>
          </div>
        </>
      )}

      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleConfirm}
        disabled={!winnerId || !decision}
        style={{ opacity: !winnerId || !decision ? 0.4 : 1 }}
      >
        Start Match
      </button>
    </Sheet>
  );
}
