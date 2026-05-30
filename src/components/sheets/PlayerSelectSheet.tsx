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
  featuredId?: string;
  featuredLabel?: string;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#f97316','#22c55e','#60a5fa','#a78bfa','#fbbf24','#f87171','#34d399','#818cf8'];

export default function PlayerSelectSheet({
  open, onClose, onSelect, players, title, excludeIds = [], featuredId, featuredLabel
}: PlayerSelectSheetProps) {
  const available = players.filter(p => !excludeIds.includes(p.id));

  // Sort featured player to top
  const sorted = featuredId
    ? [...available].sort((a, b) => (a.id === featuredId ? -1 : b.id === featuredId ? 1 : 0))
    : available;

  const handleSelect = (playerId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    onSelect(playerId);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
          No players available
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sorted.map((player, idx) => {
            const isFeatured = player.id === featuredId;
            return (
              <button
                key={player.id}
                className="sheet-option"
                onClick={() => handleSelect(player.id)}
                style={isFeatured ? { border: '1px solid rgba(249,115,22,.3)', background: 'rgba(249,115,22,.06)' } : undefined}
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
                  <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Barlow, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {player.name}
                    {isFeatured && featuredLabel && (
                      <span style={{ fontSize: '10px', background: 'rgba(249,115,22,.15)', color: 'var(--live)', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, fontFamily: 'Barlow, sans-serif' }}>
                        {featuredLabel}
                      </span>
                    )}
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
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
