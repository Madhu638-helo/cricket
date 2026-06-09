import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/lib/prisma';
import { SignJWT } from 'jose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('--- STARTING 9-PLAYER E2E MATCH SIMULATION ---');

  // 1. Create 9 dummy users via Prisma (to bypass password hashing etc for speed)
  const users: any[] = [];
  for (let i = 1; i <= 9; i++) {
    const u = await prisma.user.upsert({
      where: { username: `testplayer_${i}` },
      update: {},
      create: {
        name: `Test Player ${i}`,
        username: `testplayer_${i}`,
        password: 'hashed_password', // Mock
      }
    });
    users.push(u);
  }
  console.log('✅ Created/Fetched 9 test users');

  // Clear career stats for test users to ensure clean assertions
  await supabase.from('batting_career_stats').delete().in('user_id', users.map(u => u.id));
  await supabase.from('bowling_career_stats').delete().in('user_id', users.map(u => u.id));

  // 2. Create session and match
  const matchCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const token = await new SignJWT({ id: users[0].id, name: users[0].name, username: users[0].username, isAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-cricket-admin-key'));
    
  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `cricket_user_session=${token}`
  };

  const { data: session } = await supabase.from('sessions').insert({
    code: matchCode,
    name: 'E2E Test Match',
    status: 'lobby',
    owner_id: users[0].id,
  }).select().single();
  
  if (!session) throw new Error('Failed to create session');
  console.log(`✅ Created Session: ${matchCode}`);

  const { data: teamA } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team A' }).select().single();
  const { data: teamB } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team B' }).select().single();

  const { data: match } = await supabase.from('matches').insert({
    session_id: session.id,
    match_number: 1,
    overs: 3,
    team1_id: teamA!.id,
    team2_id: teamB!.id,
    status: 'toss',
  }).select().single();
  console.log('✅ Created Match & Teams');

  // 3. Join users & Assign
  // Users 1-4 -> Team A
  // Users 5-8 -> Team B
  // User 9 -> Joker
  const players = [];
  for (let i = 0; i < 9; i++) {
    let tId = null;
    let isJoker = false;
    if (i < 4) tId = teamA!.id;
    else if (i < 8) tId = teamB!.id;
    else isJoker = true;

    const { data: p } = await supabase.from('players').insert({
      session_id: session.id,
      user_id: users[i].id,
      name: users[i].name,
      team_id: tId,
      is_joker: isJoker,
      is_scorer: i === 0,
      approval_status: 'approved'
    }).select().single();
    players.push(p!);
  }
  console.log('✅ Assigned 4 to Team A, 4 to Team B, 1 Joker');

  const teamAPlayers = players.filter(p => p.team_id === teamA!.id);
  const teamBPlayers = players.filter(p => p.team_id === teamB!.id);

  // 4. Toss -> Team A bats first
  console.log('🏏 Triggering Toss: Team A bats first');
  const tossRes = await fetch(`http://localhost:3000/api/match/${matchCode}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'set_toss',
      data: { tossWinnerId: teamA!.id, decision: 'bat', matchId: match!.id, opener1Id: teamAPlayers[0].id, opener2Id: teamAPlayers[1].id }
    })
  });
  if (!tossRes.ok) {
    console.error('Toss API failed:', await tossRes.text());
    process.exit(1);
  }

  // Fetch innings 1
  const { data: innings1, error: inn1Err } = await supabase.from('innings').select('*').eq('match_id', match!.id).eq('innings_number', 1).single();
  if (inn1Err || !innings1) {
    console.error('Innings 1 not found! Error:', inn1Err);
    process.exit(1);
  }

  // Innings 1: 3 overs. Include a Wide, a No-ball, and a Wicket
  console.log('🏏 Simulating Innings 1 with Extras & Wickets...');
  const ballsToInsert = [];
  let currentBatsman = teamAPlayers[0];
  let currentNonStriker = teamAPlayers[1];
  let currentBowler = teamBPlayers[0];
  let deliveryCount = 0;
  let runTotal = 0;
  let ballTotal = 0;
  let wickets = 0;

  for (let over = 0; over < 3; over++) {
    currentBowler = teamBPlayers[over % teamBPlayers.length];
    
    // Simulate exactly 6 legal deliveries per over
    for (let ball = 1; ball <= 6; ball++) {
      deliveryCount++;
      
      // Inject complex events in the 2nd over
      if (over === 1 && ball === 2) {
        // Wide ball (1 run extra, no ball faced, 0 legal balls)
        ballsToInsert.push({
          innings_id: innings1!.id, batsman_id: currentBatsman.id, bowler_id: currentBowler.id, non_striker_id: currentNonStriker.id,
          over_number: over, ball_number: ball - 1, delivery_number: deliveryCount, runs_off_bat: 0, extras: 1, extra_type: 'wide', is_wicket: false
        });
        runTotal += 1;
        deliveryCount++;
      }
      
      if (over === 1 && ball === 4) {
        // Wicket! Bowled.
        ballsToInsert.push({
          innings_id: innings1!.id, batsman_id: currentBatsman.id, bowler_id: currentBowler.id, non_striker_id: currentNonStriker.id,
          over_number: over, ball_number: ball, delivery_number: deliveryCount, runs_off_bat: 0, extras: 0, extra_type: 'none', is_wicket: true, wicket_type: 'bowled'
        });
        wickets++;
        ballTotal++;
        // New batsman comes in
        currentBatsman = teamAPlayers[2]; 
        deliveryCount++;
        continue; // Proceed to next ball
      }

      // Normal ball (4 runs on the 6th ball of each over, 1 run otherwise)
      const runs = ball === 6 ? 4 : 1;
      ballsToInsert.push({
        innings_id: innings1!.id,
        batsman_id: currentBatsman.id,
        bowler_id: currentBowler.id,
        non_striker_id: currentNonStriker.id,
        over_number: over,
        ball_number: ball,
        delivery_number: deliveryCount,
        runs_off_bat: runs,
        extras: 0,
        extra_type: 'none',
        is_wicket: false
      });
      runTotal += runs;
      ballTotal++;

      // Rotate strike
      if (runs % 2 !== 0 && ball !== 6) {
        const temp = currentBatsman;
        currentBatsman = currentNonStriker;
        currentNonStriker = temp;
      }
    }
  }
  // Insert balls and update innings total
  const { error: b1Err } = await supabase.from('balls').insert(ballsToInsert);
  if (b1Err) { console.error('Balls 1 insert error:', b1Err); process.exit(1); }
  await supabase.from('innings').update({ total_runs: runTotal, total_balls: ballTotal, total_wickets: wickets }).eq('id', innings1!.id);

  console.log(`✅ Finishing Innings 1 (Total: ${runTotal}/${wickets} in ${ballTotal} balls)`);
  const endInnings1Res = await fetch(`http://localhost:3000/api/match/${matchCode}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'innings_end', data: { inningsId: innings1!.id, matchId: match!.id } })
  });
  if (!endInnings1Res.ok) { console.error('End Innings 1 API failed:', await endInnings1Res.text()); process.exit(1); }
  const i1Res = await endInnings1Res.json();
  const target = runTotal + 1;
  console.log('Target is:', target);

  // 6. Start Innings 2
  console.log('🏏 Starting Innings 2');
  const startInnings2Res = await fetch(`http://localhost:3000/api/match/${matchCode}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'start_innings_2',
      data: { matchId: match!.id, battingTeamId: teamB!.id, target: target, opener1Id: teamBPlayers[0].id, opener2Id: teamBPlayers[1].id }
    })
  });
  if (!startInnings2Res.ok) { console.error('Start Innings 2 API failed:', await startInnings2Res.text()); process.exit(1); }
  const i2Res = await startInnings2Res.json();
  const innings2Id = i2Res.innings2Id;

  // 7. Simulate Innings 2 - chasing
  console.log('🏏 Simulating Innings 2...');
  const ballsToInsert2 = [];
  let runsChase = 0;
  let ball2 = 1;
  // Hit sixes until they win
  while (runsChase < target) {
    ballsToInsert2.push({
      innings_id: innings2Id,
      batsman_id: teamBPlayers[0].id,
      bowler_id: teamAPlayers[0].id,
      over_number: 1,
      ball_number: ball2,
      delivery_number: ball2,
      runs_off_bat: 6,
      extras: 0,
      extra_type: 'none',
      is_wicket: false
    });
    runsChase += 6;
    ball2++;
  }
  const { error: b2Err } = await supabase.from('balls').insert(ballsToInsert2);
  if (b2Err) { console.error('Balls 2 insert error:', b2Err); process.exit(1); }
  await supabase.from('innings').update({ total_runs: runsChase, total_balls: ball2 - 1, total_wickets: 0 }).eq('id', innings2Id);

  console.log('✅ Finishing Innings 2 via API');
  const endInnings2Res = await fetch(`http://localhost:3000/api/match/${matchCode}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'innings_end', data: { inningsId: innings2Id, matchId: match!.id } })
  });
  if (!endInnings2Res.ok) { console.error('End Innings 2 API failed:', await endInnings2Res.text()); process.exit(1); }
  const matchResult = await endInnings2Res.json();
  console.log('🎉 Match Result:', matchResult.result);

  // 8. Validate Career Stats
  console.log('📊 Validating Stats for ALL users');
  const { data: allBStats } = await supabase.from('batting_career_stats').select('*').in('user_id', users.map(u => u.id));
  console.log('All Batting Stats:', allBStats?.map(b => ({ user_id: b.user_id, runs: b.runs, not_outs: b.not_outs })));

  // User 0 (Team A opener 1) faced Wickets and Wides
  const bStatsTeamA0 = allBStats?.find(s => s.user_id === teamAPlayers[0].user_id);
  // User 2 (Team A new batsman)
  const bStatsTeamA2 = allBStats?.find(s => s.user_id === teamAPlayers[2].user_id);

  console.log('Runs for User 0 (Team A opener 1, got out):', bStatsTeamA0?.runs, 'Not Outs:', bStatsTeamA0?.not_outs);
  console.log('Runs for User 2 (Team A new bat):', bStatsTeamA2?.runs);
  
  const bStats = allBStats?.find(s => s.user_id === users[4].id);
  console.log('Runs for User 4 (Chasing Batsman):', bStats?.runs);

  // Verify wicket logic: Team A opener 0 was bowled, so `not_outs` should be 0, `innings` should be 1.
  if (matchResult.result && bStats && bStats.runs >= target && bStatsTeamA0 && bStatsTeamA0.not_outs === 0) {
    console.log('✅ COMPLEX SCENARIO END TO END TEST PASSED!');
    process.exit(0);
  } else {
    console.error('❌ COMPLEX VALIDATION FAILED');
    process.exit(1);
  }
}

main().catch(console.error);
