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
          
          if (myInnings) {
            runsFor += myInnings.total_runs;
            const wasChasingAndWon = m.winner_id === team.id && myInnings.innings_number === 2;
            // If they didn't successfully chase, and they batted fewer than max balls, they were bowled out
            ballsFor += wasChasingAndWon ? myInnings.total_balls : Math.max(myInnings.total_balls, m.overs * 6);
          }
          if (oppInnings) {
            runsAgainst += oppInnings.total_runs;
            const oppWasChasingAndWon = m.winner_id === oppInnings.team_id && oppInnings.innings_number === 2;
            ballsAgainst += oppWasChasingAndWon ? oppInnings.total_balls : Math.max(oppInnings.total_balls, m.overs * 6);
          }
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

  if (loading) return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
      Loading session data…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Standings table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', background: 'var(--live)', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Session Standings</span>
          </div>
          <span className="tag tag-live">LIVE</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {i === 0 && <span>🥇</span>}
                      {i === 1 && <span>🥈</span>}
                      <span style={{ fontWeight: 700 }}>{s.team.name}</span>
                    </div>
                  </td>
                  <td>{s.played}</td>
                  <td style={{ color: s.won > 0 ? 'var(--green)' : 'inherit', fontWeight: s.won > 0 ? 700 : 400 }}>{s.won}</td>
                  <td style={{ color: s.lost > 0 ? '#f87171' : 'inherit', fontWeight: s.lost > 0 ? 700 : 400 }}>{s.lost}</td>
                  <td style={{ fontWeight: 800, color: 'var(--txt)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px' }}>{s.points}</td>
                  <td style={{ color: parseFloat(s.nrr) >= 0 ? 'var(--green)' : '#f87171', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {parseFloat(s.nrr) >= 0 ? '+' : ''}{s.nrr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match results */}
      {matches.length > 0 && (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '16px', background: 'var(--green)', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Barlow, sans-serif' }}>Match Results</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {matches.map(m => (
              <div key={m.id} style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--txt)', fontFamily: 'Barlow, sans-serif' }}>Match {m.match_number}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 600, maxWidth: '200px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.result ?? 'In progress'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
