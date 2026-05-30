'use client';
import { Sheet } from './Sheet';
import type { WicketType, Player } from '@/types/cricket';

const WICKET_TYPES: { type: WicketType; label: string; icon: string; needsFielder: boolean }[] = [
  { type: 'bowled',      label: 'Bowled',       icon: '🎯', needsFielder: false },
  { type: 'caught',      label: 'Caught',        icon: '🤝', needsFielder: true  },
  { type: 'lbw',         label: 'LBW',           icon: '🦵', needsFielder: false },
  { type: 'runout',      label: 'Run Out',       icon: '🏃', needsFielder: true  },
  { type: 'stumped',     label: 'Stumped',       icon: '🧤', needsFielder: true  },
  { type: 'hitwicket',   label: 'Hit Wicket',    icon: '💥', needsFielder: false },
  { type: 'retiredhurt', label: 'Retired Hurt',  icon: '🤕', needsFielder: false },
];

interface WicketSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (type: WicketType, fielderId?: string) => void;
  fieldingTeamPlayers: Player[];
  runsOffBat: number;
}

export default function WicketSheet({ open, onClose, onConfirm, fieldingTeamPlayers, runsOffBat }: WicketSheetProps) {
  const [selectedType, setSelectedType] = React.useState<WicketType | null>(null);
  const [fielderId, setFielderId] = React.useState<string>('');

  const chosen = WICKET_TYPES.find(w => w.type === selectedType);

  const handleConfirm = () => {
    if (!selectedType) return;
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    onConfirm(selectedType, fielderId || undefined);
    setSelectedType(null);
    setFielderId('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Wicket — How Out?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {WICKET_TYPES.map(wt => (
          <button
            key={wt.type}
            className={`sheet-option ${selectedType === wt.type ? 'selected' : ''}`}
            onClick={() => { setSelectedType(wt.type); setFielderId(''); }}
          >
            <span style={{ fontSize: '1.25rem' }}>{wt.icon}</span>
            {wt.label}
          </button>
        ))}
      </div>

      {chosen?.needsFielder && (
        <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
          <label className="form-label">Fielder (optional)</label>
          <select
            className="form-input"
            value={fielderId}
            onChange={e => setFielderId(e.target.value)}
          >
            <option value="">— Select fielder —</option>
            {fieldingTeamPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <button
        className="btn btn-danger btn-full btn-lg"
        onClick={handleConfirm}
        disabled={!selectedType}
        style={{ opacity: !selectedType ? 0.4 : 1, marginBottom: 'var(--sp-2)' }}
      >
        Confirm Wicket
      </button>
    </Sheet>
  );
}

// Needs React import
import React from 'react';
