'use client';
import React from 'react';
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
  { type: 'retiredout',  label: 'Retired Out',   icon: '🚶', needsFielder: false },
];

interface WicketSheetProps {
  open: boolean;
  onClose: () => void;
  /** outBatsmanId: 'striker' | 'nonstriker' — only relevant for runout */
  onConfirm: (type: WicketType, fielderId?: string, runsCompleted?: number, outBatsmanId?: 'striker' | 'nonstriker') => void;
  fieldingTeamPlayers: Player[];
  runsOffBat: number;
  isFreehit?: boolean;
  strikerId?: string;
  nonStrikerId?: string;
  battingPlayers?: Player[];
}

export default function WicketSheet({ open, onClose, onConfirm, fieldingTeamPlayers, runsOffBat, isFreehit, strikerId, nonStrikerId, battingPlayers }: WicketSheetProps) {
  const [selectedType, setSelectedType] = React.useState<WicketType | null>(null);
  const [fielderId, setFielderId] = React.useState<string>('');
  const [runsCompleted, setRunsCompleted] = React.useState<number>(0);
  const [outBatsmanId, setOutBatsmanId] = React.useState<string>('striker');

  // Filter wicket types for free hit — only runout allowed
  const availableTypes = isFreehit
    ? WICKET_TYPES.filter(w => w.type === 'runout')
    : WICKET_TYPES;

  const chosen = WICKET_TYPES.find(w => w.type === selectedType);

  const handleConfirm = () => {
    if (!selectedType) return;
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    onConfirm(
      selectedType,
      fielderId || undefined,
      selectedType === 'runout' ? runsCompleted : undefined,
      selectedType === 'runout' ? (outBatsmanId as 'striker' | 'nonstriker') : undefined,
    );
    setSelectedType(null);
    setFielderId('');
    setRunsCompleted(0);
    setOutBatsmanId('striker');
    onClose();
  };

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setSelectedType(null);
      setFielderId('');
      setRunsCompleted(0);
      setOutBatsmanId('striker');
    }
  }, [open]);

  const strikerName = battingPlayers?.find(p => p.id === strikerId)?.name ?? 'Striker';
  const nonStrikerName = battingPlayers?.find(p => p.id === nonStrikerId)?.name ?? 'Non-Striker';

  return (
    <Sheet open={open} onClose={onClose} title={isFreehit ? 'Free Hit — Run Out Only' : 'Wicket — How Out?'}>
      {isFreehit && (
        <div style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', fontFamily: 'Barlow, sans-serif', color: 'var(--live)', fontWeight: 700, textAlign: 'center' }}>
          ⚡ FREE HIT — Only Run Out is allowed
        </div>
      )}

      {/* Wicket type grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '16px',
      }}>
        {availableTypes.map(wt => {
          const isSelected = selectedType === wt.type;
          return (
            <button
              key={wt.type}
              onClick={() => { setSelectedType(wt.type); setFielderId(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 12px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #e31b23' : '1px solid var(--border)',
                background: isSelected ? 'rgba(227,27,35,.1)' : 'var(--s1)',
                color: isSelected ? '#fca5a5' : 'var(--txt)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'Barlow, sans-serif',
                transition: 'all .15s ease',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px' }}>{wt.icon}</span>
              <span>{wt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Run-out extras: runs completed + who is out */}
      {selectedType === 'runout' && (
        <div style={{ marginBottom: '16px' }}>
          {/* Runs completed before run-out */}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px', fontFamily: 'Barlow, sans-serif' }}>
            Runs completed before dismissal
          </label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[0, 1, 2, 3].map(r => (
              <button key={r} onClick={() => setRunsCompleted(r)} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: runsCompleted === r ? '2px solid var(--green)' : '1px solid var(--border)',
                background: runsCompleted === r ? 'rgba(34,197,94,.1)' : 'var(--s2)',
                color: runsCompleted === r ? '#4ade80' : 'var(--txt)',
                fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {r}
              </button>
            ))}
          </div>

          {/* Who is out */}
          {strikerId && nonStrikerId && nonStrikerId !== 'single' && (
            <>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '8px', fontFamily: 'Barlow, sans-serif' }}>
                Who is out?
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                {[
                  { id: 'striker', name: strikerName, label: 'Striker' },
                  { id: 'nonstriker', name: nonStrikerName, label: 'Non-Striker' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setOutBatsmanId(opt.id)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: '10px',
                    border: outBatsmanId === opt.id ? '2px solid #e31b23' : '1px solid var(--border)',
                    background: outBatsmanId === opt.id ? 'rgba(227,27,35,.1)' : 'var(--s2)',
                    color: outBatsmanId === opt.id ? '#fca5a5' : 'var(--txt)',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif', textAlign: 'left',
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>{opt.label}</div>
                    <div>{opt.name}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fielder selection */}
      {chosen?.needsFielder && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '.6px',
            marginBottom: '8px',
            fontFamily: 'Barlow, sans-serif',
          }}>
            {selectedType === 'caught' ? 'Caught by' : selectedType === 'runout' ? 'Fielder' : 'Keeper / Fielder'}
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            maxHeight: '180px',
            overflowY: 'auto',
          }}>
            {fieldingTeamPlayers.map(p => {
              const isFielderSelected = fielderId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setFielderId(p.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isFielderSelected ? '2px solid #3b82f6' : '1px solid var(--border)',
                    background: isFielderSelected ? 'rgba(59,130,246,.1)' : 'var(--s2)',
                    color: isFielderSelected ? 'var(--blue)' : 'var(--txt)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'Barlow, sans-serif',
                    transition: 'all .15s ease',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedType && (
        <div style={{
          background: 'rgba(239,68,68,.06)',
          border: '1px solid rgba(239,68,68,.15)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '12px',
          fontFamily: 'Barlow, sans-serif',
          color: '#fca5a5',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          {chosen?.icon} {chosen?.label}
          {fielderId && ` — ${fieldingTeamPlayers.find(p => p.id === fielderId)?.name}`}
          {selectedType === 'runout' && runsCompleted > 0 && ` (${runsCompleted} run${runsCompleted > 1 ? 's' : ''} completed)`}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedType}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: 'none',
          background: selectedType ? 'linear-gradient(135deg,#e31b23,#b91c1c)' : 'var(--s2)',
          color: selectedType ? '#fff' : 'var(--dim)',
          fontSize: '14px',
          fontWeight: 800,
          fontFamily: 'Barlow, sans-serif',
          cursor: selectedType ? 'pointer' : 'not-allowed',
          opacity: selectedType ? 1 : 0.4,
          transition: 'all .2s ease',
          letterSpacing: '.3px',
        }}
      >
        Confirm Wicket ✕
      </button>
    </Sheet>
  );
}
