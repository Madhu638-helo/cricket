'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Team, Match, Innings } from '@/types/cricket';
import { calcNRR, formatOvers } from '@/lib/cricket/engine';

interface SessionStandingsProps { code: string; }

interface Standing {
  team: Team;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: string;
}

export default function SessionStandings({ code }: SessionStandingsProps) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.from('sessions').select('*').eq('code', code).single();
      if (!session) return;

      const { data: teams } = await supabase.from('teams').select('*').eq('session_id', session.id);
      const { data: matchList } = await supabase.from('matches').select('*').eq('session_id', session.id).eq('status', 'result');
      const { data: inningsList } = await supabase.from('innings').select('*').in('match_id', (matchList ?? []).map((m: Match) => m.id));

      if (!teams) return;

      const stats = teams.map((team: Team) => {
        const played = (matchList ?? [] as Match[]).filter((m: Match) => m.team1_id === team.id || m.team2_id === team.id);
        const won = played.filter((m: Match) => m.winner_id === team.id).length;
        const lost = played.filter((m: Match) => m.winner_id !== null && m.winner_id !== team.id).length;
        const tied = played.filter((m: Match) => m.winner_id === null).length;

        // NRR calculation
        let runsFor = 0, ballsFor = 0, runsAgainst = 0, ballsAgainst = 0;
        let totalMatchBalls = 0;
        played.forEach((m: Match) => {
          const myInnings = (inningsList ?? [] as Innings[]).find((i: Innings) => i.match_id === m.id && i.team_id === team.id);
          const oppInnings = (inningsList ?? [] as Innings[]).find((i: Innings) => i.match_id === m.id && i.team_id !== team.id);
          if (myInnings) { runsFor += myInnings.total_runs; ballsFor += myInnings.total_balls; }
          if (oppInnings) { runsAgainst += oppInnings.total_runs; ballsAgainst += oppInnings.total_balls; }
          totalMatchBalls = Math.max(totalMatchBalls, m.overs * 6);
        });

        const nrr = played.length > 0
          ? calcNRR(runsFor, ballsFor, totalMatchBalls, runsAgainst, ballsAgainst).toFixed(3)
          : '+0.000';

        return { team, played: played.length, won, lost, tied, points: won * 2 + tied, nrr };
      });

      stats.sort((a: Standing, b: Standing) => b.points - a.points || parseFloat(b.nrr) - parseFloat(a.nrr));
      setStandings(stats);
      setMatches(matchList ?? []);
      setLoading(false);
    };
    load();
  }, [code, supabase]);

  if (loading) return <div className="card"><p className="text-muted text-center">Loading…</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {/* Standings table */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Session Standings</h3>
          <span className="status-pill status-live">LIVE</span>
        </div>
        <table className="score-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>Pts</th>
              <th>NRR</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team.id} className={i === 0 ? 'highlight' : ''}>
                <td>
                  {i === 0 && <span style={{ color: 'var(--amber)', marginRight: 4 }}>🥇</span>}
                  {i === 1 && <span style={{ color: 'var(--text-3)', marginRight: 4 }}>🥈</span>}
                  {s.team.name}
                </td>
                <td>{s.played}</td>
                <td>{s.won}</td>
                <td>{s.lost}</td>
                <td style={{ fontWeight: 700, color: 'var(--text-1)' }}>{s.points}</td>
                <td style={{ color: parseFloat(s.nrr) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {parseFloat(s.nrr) >= 0 ? '+' : ''}{s.nrr}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match results */}
      {matches.length > 0 && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 'var(--sp-3)' }}>Match Results</h3>
          {matches.map(m => (
            <div key={m.id} style={{
              padding: 'var(--sp-3)', borderBottom: '1px solid var(--glass-border)',
              fontSize: '0.875rem', color: 'var(--text-2)',
            }}>
              <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>Match {m.match_number}: </span>
              {m.result ?? 'In progress'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
