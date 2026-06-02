'use client';
import React, { useState } from 'react';
import type { ExtraType } from '@/types/cricket';

interface ScoringPadProps {
  onScore: (runs: number, extraType?: ExtraType, extraRuns?: number) => void;
  onWicket: (runsOffBat?: number) => void;
  onRetiredHurt: () => void;
  onUndo: () => void;
  onSwapStrike: () => void;
  onEndOverEarly?: () => void;
  isFreehitNext: boolean;
  canUndo: boolean;
  disabled?: boolean;
}

export default function ScoringPad({ onScore, onWicket, onRetiredHurt, onUndo, onSwapStrike, onEndOverEarly, isFreehitNext, canUndo, disabled }: ScoringPadProps) {
  const [noBallRuns, setNoBallRuns] = useState(0);
  const [showNoBallExtra, setShowNoBallExtra] = useState(false);
  const [showWideExtra, setShowWideExtra] = useState(false);
  const [wideRuns, setWideRuns] = useState(1);
  const [showByeExtra, setShowByeExtra] = useState(false);
  const [showLbExtra, setShowLbExtra] = useState(false);

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  const handleScore = (runs: number) => {
    vibrate(30);
    onScore(runs);
  };

  const handleWide = () => {
    vibrate(50);
    onScore(0, 'wide', wideRuns);
    setWideRuns(1);
    setShowWideExtra(false);
  };

  const handleNoBall = () => {
    vibrate(50);
    // Submit 1 extra for the No-Ball, and the bat runs separately. Avoids double-counting.
    onScore(noBallRuns, 'noball', 1);
    setNoBallRuns(0);
    setShowNoBallExtra(false);
  };

  const handleBye = (runs: number) => {
    vibrate(30);
    onScore(0, 'bye', runs);
    setShowByeExtra(false);
  };

  const handleLegBye = (runs: number) => {
    vibrate(30);
    onScore(0, 'legbye', runs);
    setShowLbExtra(false);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Score Ball
        </div>
        {isFreehitNext && (
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--gold)', background: 'rgba(245,158,11,.15)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(245,158,11,.2)', letterSpacing: '.5px', textTransform: 'uppercase', animation: 'pulse 2s infinite' }}>
            ⚡ FREE HIT
          </span>
        )}
      </div>

      {/* Wide runs picker */}
      {showWideExtra && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            Wide — total runs?
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(r => (
              <button
                key={r}
                onClick={() => setWideRuns(r)}
                className="sbtn"
                style={{ width: '40px', height: '40px', borderColor: wideRuns === r ? 'var(--red)' : 'var(--border)' }}
              >
                {r}
              </button>
            ))}
            <button onClick={handleWide} className="sbtn" style={{ height: '40px', padding: '0 16px', background: 'rgba(239,68,68,.15)', color: 'var(--red)' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* No Ball runs picker */}
      {showNoBallExtra && (
        <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            No Ball — runs off bat?
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 6].map(r => (
              <button
                key={r}
                onClick={() => setNoBallRuns(r)}
                className="sbtn"
                style={{ width: '40px', height: '40px', borderColor: noBallRuns === r ? 'var(--gold)' : 'var(--border)' }}
              >
                {r}
              </button>
            ))}
            <button onClick={handleNoBall} className="sbtn" style={{ height: '40px', padding: '0 16px', background: 'rgba(245,158,11,.15)', color: 'var(--gold)' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Bye runs picker */}
      {showByeExtra && (
        <div style={{ background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ color: 'var(--blue)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            Bye — how many runs?
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map(r => (
              <button
                key={r}
                onClick={() => handleBye(r)}
                className="sbtn"
                style={{ width: '44px', height: '40px' }}
              >
                {r}
              </button>
            ))}
            <button onClick={() => setShowByeExtra(false)} className="sbtn" style={{ height: '40px', padding: '0 12px', color: 'var(--muted)', fontSize: '11px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leg Bye runs picker */}
      {showLbExtra && (
        <div style={{ background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            Leg Bye — how many runs?
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map(r => (
              <button
                key={r}
                onClick={() => handleLegBye(r)}
                className="sbtn"
                style={{ width: '44px', height: '40px' }}
              >
                {r}
              </button>
            ))}
            <button onClick={() => setShowLbExtra(false)} className="sbtn" style={{ height: '40px', padding: '0 12px', color: 'var(--muted)', fontSize: '11px' }}>
              Cancel
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
        <button
          className="sbtn sW"
          style={{ height: '48px', opacity: isFreehitNext ? 0.3 : 1 }}
          disabled={isFreehitNext}
          onClick={() => handleWicket(0)}
        >
          {isFreehitNext ? 'FH' : 'Wkt'}
        </button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { setShowWideExtra(v => !v); setShowNoBallExtra(false); setShowByeExtra(false); setShowLbExtra(false); }}>Wd</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { setShowNoBallExtra(v => !v); setShowWideExtra(false); setShowByeExtra(false); setShowLbExtra(false); }}>Nb</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { setShowByeExtra(v => !v); setShowNoBallExtra(false); setShowWideExtra(false); setShowLbExtra(false); }}>B</button>
        <button className="sbtn sX" style={{ height: '48px' }} onClick={() => { setShowLbExtra(v => !v); setShowNoBallExtra(false); setShowWideExtra(false); setShowByeExtra(false); }}>Lb</button>
      </div>

      {/* Run-out on free hit */}
      {isFreehitNext && (
        <button
          className="sbtn sW"
          style={{ width: '100%', height: '40px', marginBottom: '8px', fontSize: '12px' }}
          onClick={() => handleWicket(0)}
        >
          Run Out (Free Hit)
        </button>
      )}

      {/* Bottom row: Undo + Swap + End Over */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <button
          className="sbtn sU"
          style={{ height: '40px', opacity: canUndo ? 1 : 0.3 }}
          disabled={!canUndo}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          className="sbtn"
          style={{ height: '40px', color: 'var(--blue)', borderColor: 'rgba(96,165,250,.2)' }}
          onClick={onSwapStrike}
        >
          Swap
        </button>
        {onEndOverEarly ? (
          <button
            className="sbtn sU"
            style={{ height: '40px', fontSize: '11px' }}
            onClick={onEndOverEarly}
          >
            End Over
          </button>
        ) : (
          <button
            className="sbtn sU"
            style={{ height: '40px', fontSize: '11px' }}
            onClick={onRetiredHurt}
          >
            Retired
          </button>
        )}
      </div>
    </div>
  );
}
