'use client';
import React, { useState } from 'react';
import type { ExtraType } from '@/types/cricket';

interface ScoringPadProps {
  onScore: (runs: number, extraType?: ExtraType, extraRuns?: number) => void;
  onWicket: (runsOffBat?: number) => void;
  onRetiredHurt: () => void;
  isFreehitNext: boolean;
  disabled?: boolean;
}

export default function ScoringPad({ onScore, onWicket, onRetiredHurt, isFreehitNext, disabled }: ScoringPadProps) {
  const [noBallRuns, setNoBallRuns] = useState(0);
  const [showNoBallExtra, setShowNoBallExtra] = useState(false);

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  const handleScore = (runs: number) => {
    vibrate(30);
    onScore(runs);
  };

  const handleWide = () => {
    vibrate(50);
    onScore(0, 'wide', 1);
  };

  const handleNoBall = () => {
    vibrate(50);
    onScore(noBallRuns, 'noball', 1 + noBallRuns);
    setNoBallRuns(0);
    setShowNoBallExtra(false);
  };

  const handleWicket = (runs = 0) => {
    vibrate([100, 50, 100]);
    onWicket(runs);
  };

  if (disabled) {
    return (
      <div className="card" style={{ padding: '14px', marginBottom: '10px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          👀 Watching live — scorer is logging
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '14px', marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px' }}>
        Score Ball
      </div>

      {showNoBallExtra && (
        <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ color: '#fcd34d', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            No Ball — runs off bat?
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 6].map(r => (
              <button
                key={r}
                onClick={() => setNoBallRuns(r)}
                className="sbtn"
                style={{ width: '40px', height: '40px', borderColor: noBallRuns === r ? '#fcd34d' : 'var(--border)' }}
              >
                {r}
              </button>
            ))}
            <button onClick={handleNoBall} className="sbtn" style={{ height: '40px', padding: '0 16px', background: 'rgba(245,158,11,.15)', color: '#fcd34d' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Runs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '8px' }}>
        <button className="sbtn" style={{ height: '50px' }} onClick={() => handleScore(0)}>0</button>
        <button className="sbtn" style={{ height: '50px' }} onClick={() => handleScore(1)}>1</button>
        <button className="sbtn" style={{ height: '50px' }} onClick={() => handleScore(2)}>2</button>
        <button className="sbtn" style={{ height: '50px' }} onClick={() => handleScore(3)}>3</button>
        <button className="sbtn" style={{ height: '50px' }} onClick={() => handleScore(5)}>5</button>
        <button className="sbtn s4" style={{ height: '50px' }} onClick={() => handleScore(4)}>4</button>
        <button className="sbtn s6" style={{ height: '50px' }} onClick={() => handleScore(6)}>6</button>
      </div>

      {/* Wicket + Extras */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <button className="sbtn sW" style={{ height: '48px' }} onClick={() => handleWicket(0)}>Wicket</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={handleWide}>Wd</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => setShowNoBallExtra(v => !v)}>Nb</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { const r = parseInt(prompt('Bye runs?') || '1', 10); if (!isNaN(r)) onScore(0, 'bye', r); }}>B</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { const r = parseInt(prompt('Leg Bye runs?') || '1', 10); if (!isNaN(r)) onScore(0, 'legbye', r); }}>Lb</button>
      </div>

      <button className="sbtn sU" style={{ width: '100%', height: '40px' }} onClick={() => alert('Undo last ball coming soon')}>
        ↶ Undo Last Ball
      </button>
    </div>
  );
}
