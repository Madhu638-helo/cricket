'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateMatchCode } from '@/lib/cricket/engine';
import type { Session, Team, Player, Match } from '@/types/cricket';

export default function AdminDashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  // Form states
  const [sessionName, setSessionName] = useState('');
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState(5);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'session' | 'lobby' | 'players' | 'match'>('session');
  const [qrCode, setQrCode] = useState('');
  const [scorerAssignments, setScorerAssignments] = useState<Record<string, string>>({});

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then((result: { data: { user: { id: string; email?: string } | null } }) => {
      const { data } = result;
      if (!data.user) { router.push('/login'); return; }
      setUser(data.user);
      loadSessions(data.user.id);
    });
  }, []);

  const loadSessions = async (uid: string) => {
    const { data } = await supabase.from('sessions').select('*').eq('admin_id', uid).order('created_at', { ascending: false });
    setSessions(data ?? []);
    if (data?.length) openSession(data[0]);
  };

  const openSession = async (session: Session) => {
    setActiveSession(session);
    const [{ data: t }, { data: p }, { data: m }] = await Promise.all([
      supabase.from('teams').select('*').eq('session_id', session.id),
      supabase.from('players').select('*').eq('session_id', session.id),
      supabase.from('matches').select('*').eq('session_id', session.id).order('match_number'),
    ]);
    setTeams(t ?? []);
    setPlayers(p ?? []);
    setMatches(m ?? []);
    setTab('lobby');
    // Generate QR
    try {
      const qr = await import('qrcode');
      const url = `${window.location.origin}/join?code=${session.code}`;
      const dataUrl = await qr.toDataURL(url, { width: 200, margin: 1, color: { dark: '#00ff88', light: '#0a1628' } });
      setQrCode(dataUrl);
    } catch {}
  };

  const createSession = async () => {
    if (!sessionName.trim() || !team1Name.trim() || !team2Name.trim()) return;
    setLoading(true);
    let code: string;
    let tries = 0;
    do {
      code = generateMatchCode();
      const { data: existing } = await supabase.from('sessions').select('id').eq('code', code).single();
      if (!existing) break;
      tries++;
    } while (tries < 5);

    const { data: session, error } = await supabase.from('sessions').insert({
      code, name: sessionName, admin_id: user?.id, status: 'lobby',
    }).select().single();

    if (!session || error) { setLoading(false); return; }

    // Create teams
    const { data: t1 } = await supabase.from('teams').insert({ session_id: session.id, name: team1Name }).select().single();
    const { data: t2 } = await supabase.from('teams').insert({ session_id: session.id, name: team2Name }).select().single();

    setLoading(false);
    setSessionName(''); setTeam1Name(''); setTeam2Name('');
    loadSessions(user!.id);
  };

  const startMatch = async () => {
    if (!activeSession) return;
    const matchNumber = matches.length + 1;
    const { data: newMatch } = await supabase.from('matches').insert({
      session_id: activeSession.id,
      match_number: matchNumber,
      overs,
      team1_id: teams[0]?.id,
      team2_id: teams[1]?.id,
      status: 'toss',
    }).select().single();

    await supabase.from('sessions').update({ status: 'active' }).eq('id', activeSession.id);
    router.push(`/match/${activeSession.code}`);
  };

  const assignScorer = async (teamId: string, playerId: string) => {
    if (!activeSession) return;
    // Remove existing scorer for this team
    await supabase.from('players').update({ is_scorer: false })
      .eq('session_id', activeSession.id).eq('team_id', teamId).eq('is_scorer', true);
    // Set new scorer
    await supabase.from('players').update({ is_scorer: true }).eq('id', playerId);
    setScorerAssignments(prev => ({ ...prev, [teamId]: playerId }));
    // Refresh players
    const { data: p } = await supabase.from('players').select('*').eq('session_id', activeSession.id);
    setPlayers(p ?? []);
  };

  const assignTeam = async (playerId: string, teamId: string) => {
    await supabase.from('players').update({ team_id: teamId }).eq('id', playerId);
    const { data: p } = await supabase.from('players').select('*').eq('session_id', activeSession!.id);
    setPlayers(p ?? []);
  };

  const endSession = async () => {
    if (!activeSession) return;
    await supabase.from('sessions').update({ status: 'finished' }).eq('id', activeSession.id);
    setActiveSession(null);
    loadSessions(user!.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const unassignedPlayers = players.filter(p => !p.team_id);
  const team1Players = players.filter(p => p.team_id === teams[0]?.id);
  const team2Players = players.filter(p => p.team_id === teams[1]?.id);

  return (
    <main className="main-content">
      <div className="page" style={{ paddingTop: 'calc(var(--sp-4) + env(safe-area-inset-top))' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.5rem' }}>Admin</h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>{user?.email}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>

        {/* Create Session */}
        {!activeSession && (
          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.125rem', marginBottom: 'var(--sp-4)' }}>
              New Session
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div className="form-group">
                <label className="form-label">Session Name</label>
                <input className="form-input" placeholder="e.g. Sunday League" value={sessionName} onChange={e => setSessionName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Team 1 Name</label>
                  <input className="form-input" placeholder="Team A" value={team1Name} onChange={e => setTeam1Name(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Team 2 Name</label>
                  <input className="form-input" placeholder="Team B" value={team2Name} onChange={e => setTeam2Name(e.target.value)} />
                </div>
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={createSession}
                disabled={loading || !sessionName.trim() || !team1Name.trim() || !team2Name.trim()}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Creating…' : '+ Create Session'}
              </button>
            </div>
          </div>
        )}

        {/* Active Session */}
        {activeSession && (
          <>
            {/* Code + QR */}
            <div className="card card-glow-green" style={{ marginBottom: 'var(--sp-4)', textAlign: 'center' }}>
              <p className="label" style={{ marginBottom: 'var(--sp-2)' }}>Match Code</p>
              <div className="code-display">{activeSession.code}</div>
              {qrCode && (
                <img src={qrCode} alt="QR code" style={{ width: 140, height: 140, margin: 'var(--sp-3) auto', display: 'block', borderRadius: 'var(--r-md)' }} />
              )}
              <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>
                Share this code — players join at <strong>/join</strong>
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)', overflowX: 'auto', paddingBottom: 4 }}>
              {(['lobby', 'players', 'match'] as const).map(t => (
                <button
                  key={t}
                  className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Lobby tab */}
            {tab === 'lobby' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                  <h3 className="section-title">Players Joined ({players.length})</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => openSession(activeSession)}>↻ Refresh</button>
                </div>
                {players.length === 0 ? (
                  <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: 'var(--sp-6)' }}>
                    Waiting for players to join…
                  </p>
                ) : (
                  <div>
                    {players.map(p => (
                      <div key={p.id} className="player-row">
                        <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
                        <span className={p.team_id === teams[0]?.id ? 'team-badge team-badge-1' : p.team_id === teams[1]?.id ? 'team-badge team-badge-2' : 'team-badge'}>
                          {p.team_id === teams[0]?.id ? teams[0].name : p.team_id === teams[1]?.id ? teams[1].name : 'Unassigned'}
                        </span>
                        {p.is_scorer && <span className="team-badge team-badge-scorer">Scorer</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Players tab — assign teams + scorers */}
            {tab === 'players' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {/* Unassigned */}
                {unassignedPlayers.length > 0 && (
                  <div className="card">
                    <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Unassigned Players</h3>
                    {unassignedPlayers.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ flex: 1 }}>{p.name}</span>
                        {teams.map(team => (
                          <button
                            key={team.id}
                            className="btn btn-secondary btn-sm"
                            onClick={() => assignTeam(p.id, team.id)}
                          >
                            → {team.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Team 1 */}
                {teams[0] && (
                  <div className="card">
                    <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>
                      <span className="team-badge team-badge-1">{teams[0].name}</span>
                    </h3>
                    {team1Players.map(p => (
                      <div key={p.id} className="player-row">
                        <span style={{ flex: 1 }}>{p.name}</span>
                        {p.is_scorer
                          ? <span className="team-badge team-badge-scorer">Scorer ✓</span>
                          : <button className="btn btn-secondary btn-sm" onClick={() => assignScorer(teams[0].id, p.id)}>Make Scorer</button>
                        }
                      </div>
                    ))}
                  </div>
                )}

                {/* Team 2 */}
                {teams[1] && (
                  <div className="card">
                    <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>
                      <span className="team-badge team-badge-2">{teams[1].name}</span>
                    </h3>
                    {team2Players.map(p => (
                      <div key={p.id} className="player-row">
                        <span style={{ flex: 1 }}>{p.name}</span>
                        {p.is_scorer
                          ? <span className="team-badge team-badge-scorer">Scorer ✓</span>
                          : <button className="btn btn-secondary btn-sm" onClick={() => assignScorer(teams[1].id, p.id)}>Make Scorer</button>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Match tab */}
            {tab === 'match' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <div className="card">
                  <h3 className="section-title" style={{ marginBottom: 'var(--sp-4)' }}>Start New Match</h3>
                  <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
                    <label className="form-label">Overs per innings</label>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      {[2, 3, 5, 6, 8, 10, 12, 15, 20, 25, 40, 50].map(o => (
                        <button
                          key={o}
                          onClick={() => setOvers(o)}
                          style={{
                            width: 48, height: 48,
                            borderRadius: 'var(--r-sm)',
                            border: `1.5px solid ${overs === o ? 'var(--green)' : 'var(--glass-border)'}`,
                            background: overs === o ? 'var(--green-bg)' : 'var(--bg-card-2)',
                            color: overs === o ? 'var(--green)' : 'var(--text-2)',
                            fontFamily: 'Outfit', fontWeight: 700,
                          }}
                        >{o}</button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-full btn-lg" onClick={startMatch}>
                    🏏 Start Match {matches.length + 1}
                  </button>
                </div>

                {/* View current match */}
                {matches.length > 0 && (
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={() => router.push(`/match/${activeSession.code}`)}
                  >
                    → Open Match Scoreboard
                  </button>
                )}

                {/* Past matches */}
                {matches.filter(m => m.status === 'result').map(m => (
                  <div key={m.id} className="card card-compact">
                    <p style={{ fontWeight: 600 }}>Match {m.match_number}</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 4 }}>{m.result}</p>
                  </div>
                ))}

                <div className="divider" />
                <button className="btn btn-danger btn-full" onClick={endSession}>
                  End Session
                </button>
              </div>
            )}
          </>
        )}

        {/* Past Sessions */}
        {sessions.filter(s => s.id !== activeSession?.id).length > 0 && (
          <div style={{ marginTop: 'var(--sp-6)' }}>
            <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Past Sessions</h3>
            {sessions.filter(s => s.id !== activeSession?.id).map(s => (
              <div key={s.id} className="player-row" style={{ cursor: 'pointer' }} onClick={() => openSession(s)}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600 }}>{s.name ?? 'Unnamed Session'}</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>Code: {s.code}</p>
                </div>
                <span className={`status-pill ${s.status === 'finished' ? 'status-done' : 'status-live'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
