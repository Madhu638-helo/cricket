'use client';
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Session, Team, Player } from '@/types/cricket';

interface PageProps { params: Promise<{ code: string }> }

export default function LobbyPage({ params }: PageProps) {
  const { code } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const name = localStorage.getItem('cricket_player_name') ?? '';
    setPlayerName(name);
    loadLobby(name);

    // Subscribe to realtime
    const channel = supabase.channel(`lobby:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadLobby(name))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadLobby(name))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code]);

  const loadLobby = async (name: string) => {
    const { data: s } = await supabase.from('sessions').select('*').eq('code', code).single();
    if (!s) { setLoading(false); return; }
    setSession(s);

    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('teams').select('*').eq('session_id', s.id),
      supabase.from('players').select('*').eq('session_id', s.id),
    ]);
    setTeams(t ?? []);
    setPlayers(p ?? []);
    setMyPlayer((p ?? []).find((pl: Player) => pl.name === name) ?? null);
    setLoading(false);

    // Auto-navigate if match is active
    if (s.status === 'active') {
      router.push(`/match/${code}`);
    }
  };

  if (loading) return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="text-center">
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-3)' }}>🏏</div>
        <p style={{ color: 'var(--text-3)' }}>Loading lobby…</p>
      </div>
    </main>
  );

  if (!session) return (
    <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="text-center">
        <p style={{ color: 'var(--red)', marginBottom: 'var(--sp-4)' }}>Session not found</p>
        <a href="/join" className="btn btn-secondary">← Back</a>
      </div>
    </main>
  );

  const team1Players = players.filter(p => p.team_id === teams[0]?.id);
  const team2Players = players.filter(p => p.team_id === teams[1]?.id);
  const unassigned = players.filter(p => !p.team_id);

  return (
    <main className="main-content">
      <div className="page" style={{ paddingTop: 'calc(var(--sp-6) + env(safe-area-inset-top))', paddingBottom: 'var(--sp-8)' }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--sp-2)' }}>⏳</div>
          <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.75rem', marginBottom: 'var(--sp-2)' }}>
            {session.name ?? 'Match Lobby'}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>
            Waiting for admin to start the match
          </p>
        </div>

        {/* Code display */}
        <div className="card card-glow-green" style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
          <p className="label" style={{ marginBottom: 'var(--sp-1)' }}>Match Code</p>
          <div className="code-display">{code}</div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 'var(--sp-2)' }}>
            Share with teammates
          </p>
        </div>

        {/* Your status */}
        {myPlayer && (
          <div className="card" style={{ marginBottom: 'var(--sp-4)', background: 'var(--green-bg)', borderColor: 'var(--border-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--green)' }}>You're in! — {myPlayer.name}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: 2 }}>
                  Team: {myPlayer.team_id
                    ? (teams.find(t => t.id === myPlayer.team_id)?.name ?? 'Assigned')
                    : 'Waiting for team assignment…'}
                  {myPlayer.is_scorer && ' · 📝 Scorer'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Players by team */}
        {teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {teams[0] && team1Players.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <span className="team-badge team-badge-1">{teams[0].name}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{team1Players.length} players</span>
                </div>
                {team1Players.map(p => (
                  <div key={p.id} className="player-row">
                    <span style={{ flex: 1 }}>{p.name}{p.name === playerName ? ' (You)' : ''}</span>
                    {p.is_scorer && <span className="team-badge team-badge-scorer">Scorer</span>}
                  </div>
                ))}
              </div>
            )}

            {teams[1] && team2Players.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <span className="team-badge team-badge-2">{teams[1].name}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{team2Players.length} players</span>
                </div>
                {team2Players.map(p => (
                  <div key={p.id} className="player-row">
                    <span style={{ flex: 1 }}>{p.name}{p.name === playerName ? ' (You)' : ''}</span>
                    {p.is_scorer && <span className="team-badge team-badge-scorer">Scorer</span>}
                  </div>
                ))}
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="card">
                <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem', marginBottom: 'var(--sp-3)' }}>Waiting for team assignment:</p>
                {unassigned.map(p => (
                  <div key={p.id} className="player-row">
                    <span>{p.name}{p.name === playerName ? ' (You)' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All players (if no teams yet) */}
        {teams.length === 0 && players.length > 0 && (
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>
              Players Joined ({players.length})
            </h3>
            {players.map(p => (
              <div key={p.id} className="player-row">
                <span>{p.name}{p.name === playerName ? ' (You)' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {session.status === 'active' && (
          <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push(`/match/${code}`)} style={{ marginTop: 'var(--sp-4)' }}>
            Go to Match →
          </button>
        )}
      </div>
    </main>
  );
}
