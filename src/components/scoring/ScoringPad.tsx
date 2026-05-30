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
      <div className="score-pad" style={{ textAlign: 'center', padding: 'var(--sp-5)' }}>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          👀 Watching live — scorer is logging
        </p>
      </div>
    );
  }

  return (
    <div className="score-pad">
      {/* No Ball run picker (shown inline before confirming) */}
      {showNoBallExtra && (
        <div style={{
          background: 'var(--amber-bg)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-3)',
          marginBottom: 'var(--sp-2)',
        }}>
          <p style={{ color: 'var(--amber)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            No Ball — runs off bat?
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 6].map(r => (
              <button
                key={r}
                onClick={() => { setNoBallRuns(r); }}
                style={{
                  width: 44, height: 44,
                  borderRadius: 'var(--r-sm)',
                  border: `1.5px solid ${noBallRuns === r ? 'var(--amber)' : 'var(--glass-border)'}`,
                  background: noBallRuns === r ? 'var(--amber-bg)' : 'var(--bg-card)',
                  color: noBallRuns === r ? 'var(--amber)' : 'var(--text-2)',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={handleNoBall}
              className="btn btn-primary"
              style={{ height: 44, padding: '0 var(--sp-4)', fontSize: '0.875rem' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Row 1: 0 1 2 */}
      <div className="score-grid">
        <button className="score-btn score-btn-dot" onClick={() => handleScore(0)} aria-label="Dot ball">·</button>
        <button className="score-btn score-btn-1" onClick={() => handleScore(1)} aria-label="1 run">1</button>
        <button className="score-btn score-btn-2" onClick={() => handleScore(2)} aria-label="2 runs">2</button>
      </div>

      {/* Row 2: 3 4 6 */}
      <div className="score-grid" style={{ marginTop: 'var(--sp-2)' }}>
        <button className="score-btn score-btn-3" onClick={() => handleScore(3)} aria-label="3 runs">3</button>
        <button className="score-btn score-btn-4" onClick={() => handleScore(4)} aria-label="Four">
          4
          {isFreehitNext && <span className="free-hit-badge">FH</span>}
        </button>
        <button className="score-btn score-btn-6" onClick={() => handleScore(6)} aria-label="Six">6</button>
      </div>

      {/* Row 3: Wide + No Ball */}
      <div className="score-grid-2" style={{ marginTop: 'var(--sp-2)' }}>
        <button
          className="score-btn score-btn-wide"
          onClick={handleWide}
          aria-label="Wide ball"
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>WIDE</span>
        </button>
        <button
          className="score-btn score-btn-noball"
          onClick={() => setShowNoBallExtra(v => !v)}
          aria-label="No ball"
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>NO BALL</span>
        </button>
      </div>

      {/* Row 4: Wicket (full width) */}
      <div style={{ marginTop: 'var(--sp-2)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <button
          className="score-btn score-btn-wicket"
          onClick={() => handleWicket(0)}
          aria-label="Wicket"
        >
          🏏 WICKET
        </button>
        <button
          className="score-btn score-btn-retired"
          onClick={() => { vibrate(30); onRetiredHurt(); }}
          aria-label="Retired hurt"
        >
          🤕 Retired Hurt
        </button>
      </div>
    </div>
  );
}
