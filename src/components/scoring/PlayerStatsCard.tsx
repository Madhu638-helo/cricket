'use client';
import React from 'react';
import type { BatsmanStats, BowlerStats, BallSummary } from '@/types/cricket';

interface PlayerStatsCardProps {
  striker: BatsmanStats | null;
  nonStriker: BatsmanStats | null;
  bowler: BowlerStats | null;
  currentOverBalls: BallSummary[];
  maxBallsPerOver: number;
  currentOverNum: number;
}

function ballClass(b: BallSummary): string {
  if (b.isWicket) return 'bW';
  if (b.isSix) return 'b6';
  if (b.isBoundary) return 'b4';
  if (b.extraType) return 'bE';
  if (b.runsOffBat > 0) return 'b1';
  return 'b0';
}

function ballLabel(b: BallSummary): string {
  if (b.isWicket) return 'W';
  if (b.extraType === 'wide') return 'wd';
  if (b.extraType === 'noball') return 'nb';
  if (b.extraType === 'bye') return 'b';
  if (b.extraType === 'legbye') return 'lb';
  if (b.isSix) return '6';
  if (b.isBoundary) return '4';
  return b.runsOffBat === 0 ? '·' : String(b.runsOffBat);
}

function PlayerStatsCard({
  striker, nonStriker, bowler, currentOverBalls, maxBallsPerOver, currentOverNum
}: PlayerStatsCardProps) {
  const legalBalls = currentOverBalls.filter(b => !b.isWide && !b.isNoBall).length;
  const emptySlots = Math.max(0, maxBallsPerOver - legalBalls);

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }}>
      {/* Batsmen */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>Batsman</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>R</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>B</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>4s</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>6s</th>
            <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', paddingBottom: '6px', fontFamily: 'Barlow, sans-serif' }}>SR</th>
          </tr>
        </thead>
        <tbody>
          {[striker, nonStriker].map((bat, idx) => bat ? (
            <tr key={bat.player.id} style={{ borderTop: idx === 1 ? '1px solid var(--border)' : undefined }}>
              <td style={{ paddingTop: '7px', paddingBottom: '7px', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)', fontFamily: 'Barlow, sans-serif' }}>
                  {bat.player.name}
                </span>
                {idx === 0 && <span style={{ marginLeft: '4px', fontSize: '13px', color: 'var(--live)', fontWeight: 900 }}>*</span>}
              </td>
              <td style={{ textAlign: 'right', fontSize: '16px', fontWeight: 900, color: 'var(--green)', fontFamily: 'Barlow Condensed, sans-serif', paddingTop: '7px', paddingBottom: '7px' }}>{bat.runs}</td>
              <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', paddingTop: '7px', paddingBottom: '7px' }}>{bat.balls}</td>
              <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--gold)', fontWeight: 700, fontFamily: 'Barlow, sans-serif', paddingTop: '7px', paddingBottom: '7px' }}>{bat.fours}</td>
              <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--purple)', fontWeight: 700, fontFamily: 'Barlow, sans-serif', paddingTop: '7px', paddingBottom: '7px' }}>{bat.sixes}</td>
              <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', paddingTop: '7px', paddingBottom: '7px' }}>{bat.strikeRate.toFixed(1)}</td>
            </tr>
          ) : (
            <tr key={`empty-${idx}`} style={{ borderTop: idx === 1 ? '1px solid var(--border)' : undefined }}>
              <td colSpan={6} style={{ paddingTop: '7px', paddingBottom: '7px', fontSize: '12px', color: 'var(--dim)', fontFamily: 'Barlow, sans-serif' }}>
                {idx === 0 ? 'Select striker' : 'Select non-striker'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ height: '1px', background: 'var(--border)', margin: '2px 0 10px' }} />

      {/* Bowler + over dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)', fontFamily: 'Barlow, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bowler?.player.name || 'Select Bowler'}
          </div>
          {bowler && (
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', marginTop: '1px' }}>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{bowler.overs.toFixed(1)}</span>
              <span style={{ margin: '0 3px', color: 'var(--dim)' }}>-</span>
              <span>{bowler.maidens}</span>
              <span style={{ margin: '0 3px', color: 'var(--dim)' }}>-</span>
              <span>{bowler.runs}</span>
              <span style={{ margin: '0 3px', color: 'var(--dim)' }}>-</span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{bowler.wickets}</span>
              <span style={{ marginLeft: '6px', color: 'var(--dim)' }}>eco {bowler.economy.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          {currentOverBalls.map((b, i) => (
            <div key={i} className={`ball ${ballClass(b)}`} style={{ width: '26px', height: '26px', fontSize: '10px' }}>
              {ballLabel(b)}
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`e${i}`} className="ball bP" style={{ width: '26px', height: '26px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PlayerStatsCard);
