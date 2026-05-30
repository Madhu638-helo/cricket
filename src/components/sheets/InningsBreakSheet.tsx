'use client';
import React, { useState } from 'react';
import { Sheet } from './Sheet';

interface InningsBreakSheetProps {
  open: boolean;
  target: number;
  team1Runs: number;
  team1Name: string;
  team2Name: string;
  overs: number;
  onStartInnings2: (openingBat1: string, openingBat2: string, bowlerId: string) => void;
  battingPlayers: { id: string; name: string }[];
  bowlingPlayers: { id: string; name: string }[];
}

export default function InningsBreakSheet({
  open, target, team1Runs, team1Name, team2Name, overs,
  onStartInnings2, battingPlayers, bowlingPlayers
}: InningsBreakSheetProps) {
  const [bat1, setBat1] = useState('');
  const [bat2, setBat2] = useState('');
  const [bowler, setBowler] = useState('');

  const handleStart = () => {
    if (!bat1 || !bat2 || !bowler || bat1 === bat2) return;
    onStartInnings2(bat1, bat2, bowler);
  };

  return (
    <Sheet open={open} onClose={() => {}} title="Innings Break">
      {/* Score summary */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--sp-5)', background: 'var(--blue-bg)', borderColor: 'rgba(56,189,248,0.2)' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 'var(--sp-2)' }}>
          {team1Name} scored
        </div>
        <div className="score-lg" style={{ color: 'var(--text-1)' }}>{team1Runs}</div>
        <div style={{ marginTop: 'var(--sp-3)', color: 'var(--blue)', fontWeight: 700, fontSize: '1.125rem' }}>
          🎯 Target: {target}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 'var(--sp-2)' }}>
          {team2Name} need {target} in {overs} overs
        </div>
      </div>

      {/* Opening pair */}
      <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
        <label className="form-label">Opening Batsman 1</label>
        <select className="form-input" value={bat1} onChange={e => setBat1(e.target.value)}>
          <option value="">— Select —</option>
          {battingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
        <label className="form-label">Opening Batsman 2</label>
        <select className="form-input" value={bat2} onChange={e => setBat2(e.target.value)}>
          <option value="">— Select —</option>
          {battingPlayers.filter(p => p.id !== bat1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 'var(--sp-5)' }}>
        <label className="form-label">Opening Bowler</label>
        <select className="form-input" value={bowler} onChange={e => setBowler(e.target.value)}>
          <option value="">— Select —</option>
          {bowlingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleStart}
        disabled={!bat1 || !bat2 || !bowler || bat1 === bat2}
        style={{ opacity: !bat1 || !bat2 || !bowler || bat1 === bat2 ? 0.4 : 1 }}
      >
        Start 2nd Innings →
      </button>
    </Sheet>
  );
}
