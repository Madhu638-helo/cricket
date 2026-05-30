'use client';
import React from 'react';
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

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#f97316','#22c55e','#60a5fa','#a78bfa','#fbbf24','#f87171','#34d399','#818cf8'];

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
      {available.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
          No players available
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {available.map((player, idx) => (
            <button
              key={player.id}
              className="sheet-option"
              onClick={() => handleSelect(player.id)}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, color: '#fff',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {initials(player.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                  {player.name}
                </div>
                {(player.is_captain || player.is_scorer) && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {player.is_captain && <span style={{ fontSize: '10px', background: 'rgba(251,191,36,.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>C</span>}
                    {player.is_scorer && <span style={{ fontSize: '10px', background: 'var(--blue-lo)', color: 'var(--blue)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>SCR</span>}
                  </div>
                )}
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--dim)" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
