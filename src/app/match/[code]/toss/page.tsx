'use client';
import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

export default function TossPage({ params }: PageProps) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [teams, setTeams] = useState<Team[]>([]);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | ''>('');
  const [coinFlipped, setCoinFlipped] = useState(false);
  const [coinFace, setCoinFace] = useState<'heads' | 'tails'>('heads');
  const [flipping, setFlipping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [matchOvers, setMatchOvers] = useState(5);

  useEffect(() => {
    const loadSession = async () => {
      const { data: sess } = await supabase.from('sessions').select('id, teams(*)').eq('code', code).single();
      if (sess) {
        setTeams((sess as any).teams ?? []);
        setSessionId(sess.id);
        const { data: match } = await supabase.from('matches').select('id,overs').eq('session_id', sess.id).order('created_at', { ascending: false }).limit(1).single();
        if (match) { setMatchId(match.id); setMatchOvers(match.overs); }
      }
    };
    loadSession();
  }, [code]);

  const flipCoin = () => {
    if (flipping) return;
    setFlipping(true);
    setCoinFlipped(false);
    const result = Math.random() > 0.5 ? 'heads' : 'tails';
    setTimeout(() => {
      setCoinFace(result);
      setCoinFlipped(true);
      setFlipping(false);
    }, 1200);
  };

  const proceed = async () => {
    if (!tossWinner || !tossChoice) return;
    const winnerTeam = teams.find(t => t.id === tossWinner);
    const battingTeamId = tossChoice === 'bat' ? tossWinner : teams.find(t => t.id !== tossWinner)?.id;

    let mId = matchId;
    if (!mId) {
      const { data: newMatch } = await supabase.from('matches').insert({
        session_id: sessionId,
        match_number: 1,
        overs: matchOvers,
        team1_id: teams[0]?.id,
        team2_id: teams[1]?.id,
        status: 'setup'
      }).select().single();
      mId = newMatch?.id || '';
    }

    if (mId) {
      await supabase.from('matches').update({
        toss_winner_id: tossWinner,
        toss_decision: tossChoice,
        batting_first: battingTeamId,
        status: 'innings_1',
      }).eq('id', mId);
    }

    router.push(`/match/${code}/setup`);
  };

  const canProceed = tossWinner && tossChoice;

  return (
    <div id="s-toss" className="screen">
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }} onClick={() => router.back()}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="heading" style={{ fontSize: '20px' }}>Toss</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Coin flip */}
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div
            id="coin"
            onClick={flipCoin}
            style={{
              fontSize: '72px',
              cursor: 'pointer',
              display: 'inline-block',
              userSelect: 'none',
              transition: 'transform 0.1s',
              filter: flipping ? 'brightness(0.7)' : 'brightness(1)',
              animation: flipping ? 'spin 1.2s ease-in-out' : undefined,
            }}
          >
            {coinFlipped ? (coinFace === 'heads' ? '🟡' : '⚪') : '🪙'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '12px', color: coinFlipped ? 'var(--txt)' : 'var(--muted)' }}>
            {flipping ? 'Flipping…' : coinFlipped ? `${coinFace.charAt(0).toUpperCase() + coinFace.slice(1)}!` : 'Tap coin to flip'}
          </div>
        </div>

        {/* Toss winner */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="label" style={{ marginBottom: '10px' }}>Toss won by</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {teams.map(t => (
              <button
                key={t.id}
                className={`btn ${tossWinner === t.id ? 'btn-red' : 'btn-ghost'}`}
                style={{ padding: '14px', fontSize: '14px' }}
                onClick={() => { setTossWinner(t.id); setTossChoice(''); }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Toss choice */}
        {tossWinner && (
          <div className="card" style={{ padding: '16px' }}>
            <div className="label" style={{ marginBottom: '10px' }}>
              {teams.find(t => t.id === tossWinner)?.name} chose to
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                className={`btn ${tossChoice === 'bat' ? 'btn-red' : 'btn-ghost'}`}
                style={{ padding: '14px', fontSize: '14px' }}
                onClick={() => setTossChoice('bat')}
              >
                🏏 Bat
              </button>
              <button
                className={`btn ${tossChoice === 'bowl' ? 'btn-red' : 'btn-ghost'}`}
                style={{ padding: '14px', fontSize: '14px' }}
                onClick={() => setTossChoice('bowl')}
              >
                ⚾ Bowl
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        {tossWinner && tossChoice && (
          <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.15)', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#86efac', textAlign: 'center' }}>
            <b>{teams.find(t => t.id === tossWinner)?.name}</b> won the toss and elected to <b>{tossChoice}</b> first
          </div>
        )}

        <button
          className="btn btn-red btn-full"
          style={{ padding: '15px', fontSize: '15px', opacity: canProceed ? 1 : 0.4 }}
          disabled={!canProceed}
          onClick={proceed}
        >
          Set Opening Players →
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(900deg); }
          100% { transform: rotateY(1080deg); }
        }
      `}</style>
    </div>
  );
}
