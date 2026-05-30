'use client';
import React, { useState } from 'react';
import { Sheet } from './Sheet';
import type { Player } from '@/types/cricket';

interface PlayerSelectSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (playerId: string) => void;
  players: Player[];
  title: string;
  excludeIds?: string[];
}

export default function PlayerSelectSheet({
  open, onClose, onSelect, players, title, excludeIds = []
}: PlayerSelectSheetProps) {
  const available = players.filter(p => !excludeIds.includes(p.id));

  const handleSelect = (playerId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    onSelect(playerId);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {available.length === 0 && (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 'var(--sp-6)' }}>
            No players available
          </p>
        )}
        {available.map(player => (
          <button
            key={player.id}
            className="sheet-option"
            onClick={() => handleSelect(player.id)}
          >
            <span style={{ fontSize: '1.25rem' }}>🏏</span>
            {player.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
