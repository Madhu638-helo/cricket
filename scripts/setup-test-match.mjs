// setup-test-match.mjs
// Run: node scripts/setup-test-match.mjs

import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import * as crypto from 'crypto';

const SUPABASE_URL = 'https://udffcsnfpncxgkeaabvu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZmZjc25mcG5jeGdrZWFhYnZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDExOTAyMiwiZXhwIjoyMDk1Njk1MDIyfQ.w-fciHNBUK3Sr1xksZwRxaRhtSZ3uN1VU_uBVZSU0pk';
const JWT_SECRET = 'super-secret-cricket-admin-key';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function makeJWT(userId, name, username) {
  return new SignJWT({ id: userId, name, username, isAdmin: false })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

// ─── Player definitions ───────────────────────────────────────────────────────
// 5 Team A + 5 Team B = 10 auto-joined players
// shree_116 will be 11th (manual join)
const TEST_PLAYERS = [
  // Team A (index 0..4)
  { username: 'match_owner_a', name: 'Arjun Kapoor', password: 'TestPass@1', role: 'match_owner' },
  { username: 'batsman_a2', name: 'Rohan Mehta', password: 'TestPass@2', role: 'teammate_a' },
  { username: 'batsman_a3', name: 'Karan Singh', password: 'TestPass@3', role: null },
  { username: 'batsman_a4', name: 'Vijay Sharma', password: 'TestPass@4', role: null },
  { username: 'allrounder_a5', name: 'Dev Patel', password: 'TestPass@5', role: null },
  // Team B (index 5..9)
  { username: 'scorer_b', name: 'Rahul Verma', password: 'TestPass@6', role: 'scorer_b' },
  { username: 'batsman_b2', name: 'Suresh Kumar', password: 'TestPass@7', role: null },
  { username: 'batsman_b3', name: 'Amit Yadav', password: 'TestPass@8', role: null },
  { username: 'batsman_b4', name: 'Pradeep Joshi', password: 'TestPass@9', role: null },
  { username: 'joker_player', name: 'Vikram Nair', password: 'TestPass@10', role: 'joker' }, // Joker, no team
];

// ─── Viewer account (not in match) ──────────────────────────────────────────
const VIEWER = { username: 'viewer_test', name: 'Ananya Gupta', password: 'TestPass@V', role: 'viewer' };

const MATCH_CODE = Math.random().toString(36).substring(2, 8).toUpperCase();

async function upsertUser(username, name, password) {
  const pw_hash = hashPassword(password);
  // Check if exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, name, username')
    .eq('username', username)
    .single();

  if (existing) {
    console.log(`  ↩  Reusing user: ${username} (${existing.id})`);
    return existing;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ name, username, password: pw_hash })
    .select()
    .single();

  if (error) throw new Error(`Failed to create ${username}: ${error.message}`);
  console.log(`  ✅ Created user: ${username} (${data.id})`);
  return data;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('   TURF TEST MATCH SETUP');
  console.log('══════════════════════════════════════════\n');

  // ── 1. Upsert viewer ────────────────────────────────────────────────────────
  console.log('👤 Setting up viewer account...');
  const viewerUser = await upsertUser(VIEWER.username, VIEWER.name, VIEWER.password);

  // ── 2. Upsert 10 test players ────────────────────────────────────────────────
  console.log('\n👥 Setting up 10 test players...');
  const playerUsers = [];
  for (const p of TEST_PLAYERS) {
    const u = await upsertUser(p.username, p.name, p.password);
    playerUsers.push({ ...u, ...p });
  }

  // ── 3. Find shree_116 (must already exist) ───────────────────────────────────
  console.log('\n🔍 Looking up shree_116...');
  const { data: shreeUser } = await supabase
    .from('users')
    .select('id, name, username')
    .eq('username', 'shree_116')
    .single();

  if (!shreeUser) {
    console.error('❌ User shree_116 not found in DB! Make sure they have registered.');
    process.exit(1);
  }
  console.log(`  ✅ Found shree_116: ${shreeUser.name} (${shreeUser.id})`);

  // ── 4. Create session + match ─────────────────────────────────────────────────
  console.log('\n🏏 Creating session & match...');
  const ownerUser = playerUsers[0]; // match_owner_a

  const { data: session, error: sessErr } = await supabase
    .from('sessions')
    .insert({
      code: MATCH_CODE,
      name: 'TURF Test Match 2025',
      status: 'lobby',
      owner_id: ownerUser.id,
    })
    .select()
    .single();

  if (sessErr || !session) {
    console.error('❌ Failed to create session:', sessErr?.message);
    process.exit(1);
  }
  console.log(`  ✅ Session: ${MATCH_CODE} (id: ${session.id})`);

  // Create Teams
  const { data: teamA } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team A' }).select().single();
  const { data: teamB } = await supabase.from('teams').insert({ session_id: session.id, name: 'Team B' }).select().single();
  console.log(`  ✅ Teams: Team A (${teamA.id}) | Team B (${teamB.id})`);

  // Create Match (6 overs)
  const { data: match } = await supabase.from('matches').insert({
    session_id: session.id,
    match_number: 1,
    overs: 6,
    team1_id: teamA.id,
    team2_id: teamB.id,
    status: 'lobby',
  }).select().single();
  console.log(`  ✅ Match created (${match.id}), 6 overs`);

  // ── 5. Join all 10 players ────────────────────────────────────────────────────
  console.log('\n🚀 Joining 10 players to session...');

  const teamAPlayerUsers = playerUsers.slice(0, 5);   // indices 0-4 → Team A
  const teamBPlayerUsers = playerUsers.slice(5, 10);  // indices 5-9 → Team B

  const insertedPlayers = [];

  for (let i = 0; i < playerUsers.length; i++) {
    const pu = playerUsers[i];
    const isJoker = pu.role === 'joker';           // joker_player (index 9)
    const isScorerB = pu.role === 'scorer_b';        // scorer_b (index 5)
    const teamId = isJoker ? null : (i < 5 ? teamA.id : teamB.id);

    const { data: player, error: pErr } = await supabase.from('players').insert({
      session_id: session.id,
      user_id: pu.id,
      name: pu.name,
      team_id: teamId,
      is_joker: isJoker,
      is_scorer: isScorerB,   // scorer_b is scorer for Team B
      approval_status: 'approved',
    }).select().single();

    if (pErr || !player) {
      console.error(`  ❌ Failed to join ${pu.username}:`, pErr?.message);
    } else {
      insertedPlayers.push(player);
      const teamLabel = isJoker ? '🃏 Joker' : i < 5 ? 'Team A' : 'Team B';
      const scorerLabel = isScorerB ? ' [SCORER]' : '';
      console.log(`  ✅ Joined: ${pu.name} → ${teamLabel}${scorerLabel}`);
    }
  }

  // ── 6. shree_116 joins as Team A scorer (pending — they will join via app) ────
  // We pre-create their player row as Team A scorer so that when they scan the code
  // it auto-assigns them correctly. Mark approval_status as 'approved' directly.
  console.log('\n🎯 Pre-registering shree_116 as Team A scorer...');
  const { error: shreeErr } = await supabase.from('players').insert({
    session_id: session.id,
    user_id: shreeUser.id,
    name: shreeUser.name,
    team_id: teamA.id,
    is_joker: false,
    is_scorer: true,   // shree_116 is scorer for Team A
    approval_status: 'approved',
  });

  if (shreeErr) {
    console.error('  ❌ Failed to pre-register shree_116:', shreeErr.message);
  } else {
    console.log(`  ✅ shree_116 pre-registered as Team A scorer (join with code: ${MATCH_CODE})`);
  }

  // ── 7. Print all credentials ──────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════');
  console.log('   🏏 MATCH CREATED SUCCESSFULLY');
  console.log('══════════════════════════════════════════');
  console.log(`\n📋 JOIN CODE: ${MATCH_CODE}`);
  console.log('   (Share this code — shree_116 joins manually via the app)\n');

  console.log('─────────────────────────────────────────');
  console.log('🔑 4 KEY CREDENTIALS');
  console.log('─────────────────────────────────────────\n');

  const creds = [
    { label: '1. MATCH OWNER (Team A)', player: playerUsers[0] },
    { label: '2. TEAMMATE IN TEAM A', player: playerUsers[1] },  // batsman_a2 / Rohan Mehta
    { label: '3. SCORER FOR TEAM B', player: playerUsers[5] },  // scorer_b / Rahul Verma
    { label: '4. VIEWER (no team)', player: { ...viewerUser, password: VIEWER.password, username: VIEWER.username } },
  ];

  for (const c of creds) {
    console.log(`${c.label}`);
    console.log(`   Username : ${c.player.username}`);
    console.log(`   Password : ${c.player.password}`);
    console.log(`   Name     : ${c.player.name}`);
    console.log();
  }

  console.log('─────────────────────────────────────────');
  console.log('🃏 JOKER PLAYER');
  console.log('─────────────────────────────────────────');
  console.log(`   Name     : ${playerUsers[9].name}`);
  console.log(`   Username : ${playerUsers[9].username}`);
  console.log(`   Password : ${playerUsers[9].password}`);
  console.log(`   Role     : Joker (no team)\n`);

  console.log('─────────────────────────────────────────');
  console.log('📊 TEAM BREAKDOWN');
  console.log('─────────────────────────────────────────');
  console.log('\nTEAM A (5 players) — Scored by: shree_116');
  teamAPlayerUsers.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.username})`));
  console.log('\nTEAM B (5 players) — Scored by: Rahul Verma (scorer_b)');
  teamBPlayerUsers.slice(0, 4).forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.username})`));
  console.log('\nJOKER');
  console.log(`  1. ${playerUsers[9].name} (${playerUsers[9].username})`);
  console.log('\nPLUS (manual join)');
  console.log(`  11. shree_116 (you!) → Team A Scorer`);

  console.log('\n══════════════════════════════════════════');
  console.log(`   CODE: ${MATCH_CODE}  |  6 OVERS`);
  console.log('══════════════════════════════════════════\n');
}

main().catch(e => { console.error(e); process.exit(1); });
