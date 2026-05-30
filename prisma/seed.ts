/**
 * Seed script — test data for Turf Cricket
 *
 * Accounts created:
 *   owner   / pass: Test@123   — session owner + scorer
 *   scorer  / pass: Test@123   — batting team scorer
 *   viewer  / pass: Test@123   — spectator (no team)
 *   player1..player8 / pass: Test@123 — team members
 *
 * Sessions created:
 *   SEED01 — COMPLETED match (career stats populated)
 *   SEED02 — LIVE match (innings 1 in progress, ~8 balls in)
 *
 * Run: npx tsx prisma/seed.ts
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('🌱 Seeding...');

  // ── 1. Users ────────────────────────────────────────────────
  const pw = await hash('Test@123');

  const owner = await prisma.user.upsert({
    where: { username: 'seed_owner' },
    update: {},
    create: {
      username: 'seed_owner', name: 'Arjun Singh', password: pw,
      batting_style: 'right_hand', bowling_style: 'right_arm_medium',
      player_role: 'allrounder', batting_position: 'top_order',
      jersey_number: 7, bio: 'Test owner account', preferred_ground: 'Surat Ground',
    },
  });

  const scorer = await prisma.user.upsert({
    where: { username: 'seed_scorer' },
    update: {},
    create: {
      username: 'seed_scorer', name: 'Rahul Mehta', password: pw,
      batting_style: 'right_hand', bowling_style: 'right_arm_off_spin',
      player_role: 'batsman', batting_position: 'opener', jersey_number: 17,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { username: 'seed_viewer' },
    update: {},
    create: {
      username: 'seed_viewer', name: 'Priya Watcher', password: pw,
      player_role: 'batsman',
    },
  });

  // 8 regular players
  const playerData = [
    { username: 'seed_p1',  name: 'Vikas Patel',   role: 'batsman',              bat: 'right_hand', bowl: 'none',                  pos: 'opener' },
    { username: 'seed_p2',  name: 'Dev Sharma',    role: 'allrounder',           bat: 'right_hand', bowl: 'right_arm_fast',         pos: 'top_order' },
    { username: 'seed_p3',  name: 'Kiran Das',     role: 'bowler',               bat: 'left_hand',  bowl: 'left_arm_fast',          pos: 'lower_order' },
    { username: 'seed_p4',  name: 'Amit Roy',      role: 'wicketkeeper_batsman', bat: 'right_hand', bowl: 'none',                  pos: 'middle_order' },
    { username: 'seed_p5',  name: 'Suresh Nair',   role: 'batsman',              bat: 'left_hand',  bowl: 'none',                  pos: 'top_order' },
    { username: 'seed_p6',  name: 'Ravi Kumar',    role: 'bowler',               bat: 'right_hand', bowl: 'right_arm_leg_spin',     pos: 'tail_ender' },
    { username: 'seed_p7',  name: 'Anil Verma',    role: 'allrounder',           bat: 'right_hand', bowl: 'right_arm_medium_fast',  pos: 'lower_order' },
    { username: 'seed_p8',  name: 'Prakash Joshi', role: 'batsman',              bat: 'right_hand', bowl: 'none',                  pos: 'middle_order' },
  ];

  const playerUsers = await Promise.all(playerData.map(p =>
    prisma.user.upsert({
      where: { username: p.username },
      update: {},
      create: {
        username: p.username, name: p.name, password: pw,
        player_role: p.role, batting_style: p.bat,
        bowling_style: p.bowl, batting_position: p.pos,
      },
    })
  ));

  console.log('✅ Users created');

  // ── 2. SESSION: SEED01 — completed match ────────────────────
  // Clean up old seed data in safe order (innings refs teams, must clear innings first)
  async function cleanupSession(code: string) {
    const s = await prisma.sessions.findUnique({ where: { code } });
    if (!s) return;
    const matches = await prisma.matches.findMany({ where: { session_id: s.id } });
    const matchIds = matches.map(m => m.id);
    if (matchIds.length) {
      const inningsList = await prisma.innings.findMany({ where: { match_id: { in: matchIds } } });
      const innIds = inningsList.map(i => i.id);
      if (innIds.length) await prisma.balls.deleteMany({ where: { innings_id: { in: innIds } } });
      await prisma.innings.deleteMany({ where: { match_id: { in: matchIds } } });
      await prisma.matches.deleteMany({ where: { session_id: s.id } });
    }
    await prisma.players.deleteMany({ where: { session_id: s.id } });
    await prisma.teams.deleteMany({ where: { session_id: s.id } });
    await prisma.sessions.delete({ where: { id: s.id } });
  }

  await cleanupSession('SEED01');

  const sess1 = await prisma.sessions.create({
    data: {
      code: 'SEED01', name: 'Evening T20 — Surat Ground',
      status: 'finished', owner_id: owner.id,
      ground: 'Surat Cricket Ground',
    },
  });

  const teamA = await prisma.teams.create({ data: { session_id: sess1.id, name: 'Lions' } });
  const teamB = await prisma.teams.create({ data: { session_id: sess1.id, name: 'Tigers' } });

  // Players for session 1
  const [s1_owner, s1_scorer, s1_p1, s1_p2, s1_p3, s1_p4, s1_p5, s1_p6, s1_p7, s1_p8] = await Promise.all([
    prisma.players.create({ data: { session_id: sess1.id, name: owner.name,          user_id: owner.id,          team_id: teamA.id, is_scorer: false, is_captain: true } }),
    prisma.players.create({ data: { session_id: sess1.id, name: scorer.name,         user_id: scorer.id,         team_id: teamA.id, is_scorer: true } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[0].name, user_id: playerUsers[0].id, team_id: teamA.id } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[1].name, user_id: playerUsers[1].id, team_id: teamA.id } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[2].name, user_id: playerUsers[2].id, team_id: teamA.id } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[3].name, user_id: playerUsers[3].id, team_id: teamB.id, is_captain: true } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[4].name, user_id: playerUsers[4].id, team_id: teamB.id } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[5].name, user_id: playerUsers[5].id, team_id: teamB.id, is_scorer: true } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[6].name, user_id: playerUsers[6].id, team_id: teamB.id } }),
    prisma.players.create({ data: { session_id: sess1.id, name: playerUsers[7].name, user_id: playerUsers[7].id, team_id: teamB.id } }),
  ]);

  // Match — 5 overs, Lions won by 12 runs
  const match1 = await prisma.matches.create({
    data: {
      session_id: sess1.id, match_number: 1, overs: 5,
      team1_id: teamA.id, team2_id: teamB.id,
      toss_winner_id: teamA.id, toss_decision: 'bat',
      batting_first: teamA.id,
      status: 'result',
      result: 'Lions won by 12 runs',
      winner_id: teamA.id,
    },
  });

  // Innings 1 — Lions bat: 87/3 in 5 overs
  const inn1 = await prisma.innings.create({
    data: {
      match_id: match1.id, team_id: teamA.id, innings_number: 1,
      total_runs: 87, total_wickets: 3, total_balls: 30, total_extras: 4,
      status: 'complete',
    },
  });

  // Sample balls for innings 1 — 5 complete overs
  const inn1Balls = [
    // Over 0: 0,1,4,0,2,6 = 13 runs
    { ov: 0, bn: 1, dn: 1,  bat: s1_owner.id,  bow: s1_p7.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: false },
    { ov: 0, bn: 2, dn: 2,  bat: s1_owner.id,  bow: s1_p7.id, ns: s1_scorer.id, r: 1, ex: 0, et: null, w: false },
    { ov: 0, bn: 3, dn: 3,  bat: s1_scorer.id, bow: s1_p7.id, ns: s1_owner.id,  r: 4, ex: 0, et: null, w: false },
    { ov: 0, bn: 4, dn: 4,  bat: s1_scorer.id, bow: s1_p7.id, ns: s1_owner.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 0, bn: 5, dn: 5,  bat: s1_scorer.id, bow: s1_p7.id, ns: s1_owner.id,  r: 2, ex: 0, et: null, w: false },
    { ov: 0, bn: 6, dn: 6,  bat: s1_scorer.id, bow: s1_p7.id, ns: s1_owner.id,  r: 6, ex: 0, et: null, w: false },
    // Over 1: wide,1,1,4,0,1,W = 7 runs + wide
    { ov: 1, bn: 0, dn: 7,  bat: s1_owner.id,  bow: s1_p8.id, ns: s1_scorer.id, r: 0, ex: 1, et: 'wide', w: false },
    { ov: 1, bn: 1, dn: 8,  bat: s1_owner.id,  bow: s1_p8.id, ns: s1_scorer.id, r: 1, ex: 0, et: null, w: false },
    { ov: 1, bn: 2, dn: 9,  bat: s1_scorer.id, bow: s1_p8.id, ns: s1_owner.id,  r: 1, ex: 0, et: null, w: false },
    { ov: 1, bn: 3, dn: 10, bat: s1_owner.id,  bow: s1_p8.id, ns: s1_scorer.id, r: 4, ex: 0, et: null, w: false },
    { ov: 1, bn: 4, dn: 11, bat: s1_owner.id,  bow: s1_p8.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: false },
    { ov: 1, bn: 5, dn: 12, bat: s1_owner.id,  bow: s1_p8.id, ns: s1_scorer.id, r: 1, ex: 0, et: null, w: false },
    { ov: 1, bn: 6, dn: 13, bat: s1_scorer.id, bow: s1_p8.id, ns: s1_owner.id,  r: 0, ex: 0, et: null, w: true,  wt: 'bowled' },
    // Over 2: 2,0,6,1,0,4 = 13 runs
    { ov: 2, bn: 1, dn: 14, bat: s1_p1.id,     bow: s1_p5.id, ns: s1_scorer.id, r: 2, ex: 0, et: null, w: false },
    { ov: 2, bn: 2, dn: 15, bat: s1_p1.id,     bow: s1_p5.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 3, dn: 16, bat: s1_p1.id,     bow: s1_p5.id, ns: s1_scorer.id, r: 6, ex: 0, et: null, w: false },
    { ov: 2, bn: 4, dn: 17, bat: s1_p1.id,     bow: s1_p5.id, ns: s1_scorer.id, r: 1, ex: 0, et: null, w: false },
    { ov: 2, bn: 5, dn: 18, bat: s1_scorer.id, bow: s1_p5.id, ns: s1_p1.id,     r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 6, dn: 19, bat: s1_scorer.id, bow: s1_p5.id, ns: s1_p1.id,     r: 4, ex: 0, et: null, w: false },
    // Over 3: 0,0,1,W,0,6 = 7 runs (wicket = caught)
    { ov: 3, bn: 1, dn: 20, bat: s1_scorer.id, bow: s1_p7.id, ns: s1_p1.id,     r: 0, ex: 0, et: null, w: false },
    { ov: 3, bn: 2, dn: 21, bat: s1_scorer.id, bow: s1_p7.id, ns: s1_p1.id,     r: 0, ex: 0, et: null, w: false },
    { ov: 3, bn: 3, dn: 22, bat: s1_scorer.id, bow: s1_p7.id, ns: s1_p1.id,     r: 1, ex: 0, et: null, w: false },
    { ov: 3, bn: 4, dn: 23, bat: s1_p1.id,     bow: s1_p7.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: true,  wt: 'caught', fi: s1_p5.id },
    { ov: 3, bn: 5, dn: 24, bat: s1_p2.id,     bow: s1_p7.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: false },
    { ov: 3, bn: 6, dn: 25, bat: s1_p2.id,     bow: s1_p7.id, ns: s1_scorer.id, r: 6, ex: 0, et: null, w: false },
    // Over 4: 4,1,0,W,4,6 = 15 runs
    { ov: 4, bn: 1, dn: 26, bat: s1_scorer.id, bow: s1_p8.id, ns: s1_p2.id,     r: 4, ex: 0, et: null, w: false },
    { ov: 4, bn: 2, dn: 27, bat: s1_scorer.id, bow: s1_p8.id, ns: s1_p2.id,     r: 1, ex: 0, et: null, w: false },
    { ov: 4, bn: 3, dn: 28, bat: s1_p2.id,     bow: s1_p8.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: false },
    { ov: 4, bn: 4, dn: 29, bat: s1_p2.id,     bow: s1_p8.id, ns: s1_scorer.id, r: 0, ex: 0, et: null, w: true,  wt: 'lbw' },
    { ov: 4, bn: 5, dn: 30, bat: s1_p3.id,     bow: s1_p8.id, ns: s1_scorer.id, r: 4, ex: 0, et: null, w: false },
    { ov: 4, bn: 6, dn: 31, bat: s1_p3.id,     bow: s1_p8.id, ns: s1_scorer.id, r: 6, ex: 0, et: null, w: false },
  ];

  await prisma.balls.createMany({
    data: inn1Balls.map(b => ({
      innings_id: inn1.id,
      over_number: b.ov, ball_number: b.bn, delivery_number: b.dn,
      batsman_id: b.bat, bowler_id: b.bow, non_striker_id: b.ns,
      runs_off_bat: b.r, extras: b.ex, extra_type: b.et,
      is_wicket: b.w, wicket_type: (b as any).wt ?? null,
      fielder_id: (b as any).fi ?? null,
      is_free_hit: false,
    })),
  });

  // Innings 2 — Tigers bat: 75/5 in 5 overs
  const inn2 = await prisma.innings.create({
    data: {
      match_id: match1.id, team_id: teamB.id, innings_number: 2,
      total_runs: 75, total_wickets: 5, total_balls: 30, total_extras: 2,
      status: 'complete', target: 88,
    },
  });

  const inn2Balls = [
    // Over 0: 0,4,0,W,0,1 = 5 runs
    { ov: 0, bn: 1, dn: 1,  bat: s1_p5.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 0, bn: 2, dn: 2,  bat: s1_p5.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 4, ex: 0, et: null, w: false },
    { ov: 0, bn: 3, dn: 3,  bat: s1_p5.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 0, bn: 4, dn: 4,  bat: s1_p5.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 0, ex: 0, et: null, w: true,  wt: 'bowled' },
    { ov: 0, bn: 5, dn: 5,  bat: s1_p7.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 0, bn: 6, dn: 6,  bat: s1_p7.id,  bow: s1_owner.id,  ns: s1_p6.id,  r: 1, ex: 0, et: null, w: false },
    // Over 1: 6,0,1,4,W,2 = 13 runs
    { ov: 1, bn: 1, dn: 7,  bat: s1_p6.id,  bow: s1_scorer.id, ns: s1_p7.id,  r: 6, ex: 0, et: null, w: false },
    { ov: 1, bn: 2, dn: 8,  bat: s1_p6.id,  bow: s1_scorer.id, ns: s1_p7.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 1, bn: 3, dn: 9,  bat: s1_p6.id,  bow: s1_scorer.id, ns: s1_p7.id,  r: 1, ex: 0, et: null, w: false },
    { ov: 1, bn: 4, dn: 10, bat: s1_p7.id,  bow: s1_scorer.id, ns: s1_p6.id,  r: 4, ex: 0, et: null, w: false },
    { ov: 1, bn: 5, dn: 11, bat: s1_p7.id,  bow: s1_scorer.id, ns: s1_p6.id,  r: 0, ex: 0, et: null, w: true,  wt: 'caught', fi: s1_owner.id },
    { ov: 1, bn: 6, dn: 12, bat: s1_p8.id,  bow: s1_scorer.id, ns: s1_p6.id,  r: 2, ex: 0, et: null, w: false },
    // Over 2: 0,0,0,0,0,0 = 0 runs (maiden for owner)
    { ov: 2, bn: 1, dn: 13, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 2, dn: 14, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 3, dn: 15, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 4, dn: 16, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 5, dn: 17, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 2, bn: 6, dn: 18, bat: s1_p6.id,  bow: s1_owner.id,  ns: s1_p8.id,  r: 0, ex: 0, et: null, w: false },
    // Over 3: wide,4,6,W,1,0,2 = 13+wide
    { ov: 3, bn: 0, dn: 19, bat: s1_p8.id,  bow: s1_p1.id,     ns: s1_p6.id,  r: 0, ex: 1, et: 'wide', w: false },
    { ov: 3, bn: 1, dn: 20, bat: s1_p8.id,  bow: s1_p1.id,     ns: s1_p6.id,  r: 4, ex: 0, et: null, w: false },
    { ov: 3, bn: 2, dn: 21, bat: s1_p8.id,  bow: s1_p1.id,     ns: s1_p6.id,  r: 6, ex: 0, et: null, w: false },
    { ov: 3, bn: 3, dn: 22, bat: s1_p8.id,  bow: s1_p1.id,     ns: s1_p6.id,  r: 0, ex: 0, et: null, w: true,  wt: 'caught', fi: s1_p2.id },
    { ov: 3, bn: 4, dn: 23, bat: s1_p4.id,  bow: s1_p1.id,     ns: s1_p6.id,  r: 1, ex: 0, et: null, w: false },
    { ov: 3, bn: 5, dn: 24, bat: s1_p6.id,  bow: s1_p1.id,     ns: s1_p4.id,  r: 0, ex: 0, et: null, w: false },
    { ov: 3, bn: 6, dn: 25, bat: s1_p6.id,  bow: s1_p1.id,     ns: s1_p4.id,  r: 2, ex: 0, et: null, w: false },
    // Over 4: 6,4,W,0,6,4 = 20 runs (Tigers last push)
    { ov: 4, bn: 1, dn: 26, bat: s1_p4.id,  bow: s1_p2.id,     ns: s1_p6.id,  r: 6, ex: 0, et: null, w: false },
    { ov: 4, bn: 2, dn: 27, bat: s1_p4.id,  bow: s1_p2.id,     ns: s1_p6.id,  r: 4, ex: 0, et: null, w: false },
    { ov: 4, bn: 3, dn: 28, bat: s1_p4.id,  bow: s1_p2.id,     ns: s1_p6.id,  r: 0, ex: 0, et: null, w: true,  wt: 'runout' },
    { ov: 4, bn: 4, dn: 29, bat: s1_p6.id,  bow: s1_p2.id,     ns: s1_p4.id, r: 0, ex: 0, et: null, w: false },
    { ov: 4, bn: 5, dn: 30, bat: s1_p6.id,  bow: s1_p2.id,     ns: s1_p4.id, r: 6, ex: 0, et: null, w: false },
    { ov: 4, bn: 6, dn: 31, bat: s1_p6.id,  bow: s1_p2.id,     ns: s1_p4.id, r: 4, ex: 0, et: null, w: false },
  ];

  await prisma.balls.createMany({
    data: inn2Balls.map(b => ({
      innings_id: inn2.id,
      over_number: b.ov, ball_number: b.bn, delivery_number: b.dn,
      batsman_id: b.bat, bowler_id: b.bow, non_striker_id: b.ns,
      runs_off_bat: b.r, extras: b.ex, extra_type: b.et,
      is_wicket: b.w, wicket_type: (b as any).wt ?? null,
      fielder_id: (b as any).fi ?? null,
      is_free_hit: false,
    })),
  });

  console.log('✅ SEED01 completed match created');

  // ── 3. SESSION: SEED02 — live match ─────────────────────────
  await cleanupSession('SEED02');

  const sess2 = await prisma.sessions.create({
    data: {
      code: 'SEED02', name: 'Morning Practice — 5 Overs',
      status: 'active', owner_id: owner.id,
      ground: 'Local Ground',
    },
  });

  const teamC = await prisma.teams.create({ data: { session_id: sess2.id, name: 'Strikers' } });
  const teamD = await prisma.teams.create({ data: { session_id: sess2.id, name: 'Blazers' } });

  // Same players, different session
  const [s2_owner, s2_scorer, s2_p1, s2_p2, s2_p3, s2_p4, s2_p5, s2_p6, s2_p7] = await Promise.all([
    prisma.players.create({ data: { session_id: sess2.id, name: owner.name,          user_id: owner.id,          team_id: teamC.id, is_captain: true } }),
    prisma.players.create({ data: { session_id: sess2.id, name: scorer.name,         user_id: scorer.id,         team_id: teamC.id, is_scorer: true } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[0].name, user_id: playerUsers[0].id, team_id: teamC.id } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[1].name, user_id: playerUsers[1].id, team_id: teamC.id } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[2].name, user_id: playerUsers[2].id, team_id: teamD.id, is_captain: true } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[3].name, user_id: playerUsers[3].id, team_id: teamD.id } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[4].name, user_id: playerUsers[4].id, team_id: teamD.id } }),
    prisma.players.create({ data: { session_id: sess2.id, name: playerUsers[5].name, user_id: playerUsers[5].id, team_id: teamD.id, is_scorer: true } }),
    // viewer — joined but no team (spectator)
    prisma.players.create({ data: { session_id: sess2.id, name: viewer.name,         user_id: viewer.id } }),
  ]);

  const match2 = await prisma.matches.create({
    data: {
      session_id: sess2.id, match_number: 1, overs: 5,
      team1_id: teamC.id, team2_id: teamD.id,
      toss_winner_id: teamC.id, toss_decision: 'bat',
      batting_first: teamC.id, status: 'innings_1',
    },
  });

  // Active innings — Strikers batting, 8 balls done (1 over + 2 balls)
  const inn3 = await prisma.innings.create({
    data: {
      match_id: match2.id, team_id: teamC.id, innings_number: 1,
      total_runs: 23, total_wickets: 1, total_balls: 8, total_extras: 1,
      status: 'active',
    },
  });

  const liveB = [
    // Over 0: 4,0,6,W,1,0 = 11 runs, 1 wicket
    { ov: 0, bn: 1, dn: 1, bat: s2_owner.id,  bow: s2_p5.id, ns: s2_scorer.id, r: 4, ex: 0, et: null,   w: false },
    { ov: 0, bn: 2, dn: 2, bat: s2_owner.id,  bow: s2_p5.id, ns: s2_scorer.id, r: 0, ex: 0, et: null,   w: false },
    { ov: 0, bn: 3, dn: 3, bat: s2_owner.id,  bow: s2_p5.id, ns: s2_scorer.id, r: 6, ex: 0, et: null,   w: false },
    { ov: 0, bn: 4, dn: 4, bat: s2_owner.id,  bow: s2_p5.id, ns: s2_scorer.id, r: 0, ex: 0, et: null,   w: true, wt: 'caught', fi: s2_p4.id },
    { ov: 0, bn: 5, dn: 5, bat: s2_p1.id,     bow: s2_p5.id, ns: s2_scorer.id, r: 1, ex: 0, et: null,   w: false },
    { ov: 0, bn: 6, dn: 6, bat: s2_scorer.id, bow: s2_p5.id, ns: s2_p1.id,     r: 0, ex: 0, et: null,   w: false },
    // Over 1 in progress (2 balls): wide, 6
    { ov: 1, bn: 0, dn: 7, bat: s2_p1.id,     bow: s2_p3.id, ns: s2_scorer.id, r: 0, ex: 1, et: 'wide', w: false },
    { ov: 1, bn: 1, dn: 8, bat: s2_p1.id,     bow: s2_p3.id, ns: s2_scorer.id, r: 6, ex: 0, et: null,   w: false },
  ];

  await prisma.balls.createMany({
    data: liveB.map(b => ({
      innings_id: inn3.id,
      over_number: b.ov, ball_number: b.bn, delivery_number: b.dn,
      batsman_id: b.bat, bowler_id: b.bow, non_striker_id: b.ns,
      runs_off_bat: b.r, extras: b.ex, extra_type: b.et,
      is_wicket: b.w, wicket_type: (b as any).wt ?? null,
      fielder_id: (b as any).fi ?? null,
      is_free_hit: false,
    })),
  });

  // Add viewer to SEED02 (already done above — no team = spectator)
  console.log('✅ SEED02 live match created');

  // ── 4. SESSION: SEED03 — lobby (upcoming) ───────────────────
  await cleanupSession('SEED03');

  const sess3 = await prisma.sessions.create({
    data: {
      code: 'SEED03', name: 'Weekend T20',
      status: 'lobby', owner_id: owner.id,
    },
  });
  const teamE = await prisma.teams.create({ data: { session_id: sess3.id, name: 'Team A' } });
  const teamF = await prisma.teams.create({ data: { session_id: sess3.id, name: 'Team B' } });

  await prisma.matches.create({
    data: {
      session_id: sess3.id, match_number: 1, overs: 20,
      team1_id: teamE.id, team2_id: teamF.id, status: 'setup',
    },
  });

  await Promise.all([
    prisma.players.create({ data: { session_id: sess3.id, name: owner.name,  user_id: owner.id,  team_id: teamE.id } }),
    prisma.players.create({ data: { session_id: sess3.id, name: scorer.name, user_id: scorer.id, team_id: teamE.id } }),
    prisma.players.create({ data: { session_id: sess3.id, name: viewer.name, user_id: viewer.id } }),
  ]);

  console.log('✅ SEED03 lobby (upcoming) created');

  // ── 5. Career stats from SEED01 ball data ───────────────────
  // batting: owner(s1_owner) batted inn1, scorer(s1_scorer) batted inn1
  // Compute from inn1Balls + inn2Balls manually for key players

  const careerBatting = [
    // owner: inn1 — 4,0,6,W(0),... let's calc from actual balls above
    // s1_owner (owner): batsman in inn1 overs 0,1 and bowler in inn2
    { user_id: owner.id,          matches: 2, innings: 2, runs: 18, balls_faced: 8,  fours: 1, sixes: 1, not_outs: 1, highest_score: 18, average: '18.00', strike_rate: '225.00' },
    { user_id: scorer.id,         matches: 2, innings: 2, runs: 14, balls_faced: 10, fours: 1, sixes: 0, not_outs: 0, highest_score: 10, average: '7.00',  strike_rate: '140.00' },
    { user_id: playerUsers[0].id, matches: 2, innings: 2, runs: 22, balls_faced: 14, fours: 2, sixes: 1, not_outs: 0, highest_score: 22, average: '11.00', strike_rate: '157.14' },
    { user_id: playerUsers[1].id, matches: 1, innings: 1, runs: 31, balls_faced: 18, fours: 2, sixes: 2, not_outs: 1, highest_score: 31, average: '31.00', strike_rate: '172.22' },
    { user_id: playerUsers[2].id, matches: 1, innings: 1, runs: 8,  balls_faced: 6,  fours: 1, sixes: 0, not_outs: 0, highest_score: 8,  average: '8.00',  strike_rate: '133.33' },
    { user_id: playerUsers[3].id, matches: 1, innings: 1, runs: 17, balls_faced: 10, fours: 1, sixes: 1, not_outs: 0, highest_score: 17, average: '17.00', strike_rate: '170.00' },
    { user_id: playerUsers[4].id, matches: 1, innings: 1, runs: 11, balls_faced: 8,  fours: 0, sixes: 1, not_outs: 0, highest_score: 11, average: '11.00', strike_rate: '137.50' },
    { user_id: playerUsers[5].id, matches: 1, innings: 1, runs: 19, balls_faced: 11, fours: 2, sixes: 1, not_outs: 1, highest_score: 19, average: '19.00', strike_rate: '172.73' },
  ];
  for (const s of careerBatting) {
    await prisma.batting_career_stats.upsert({
      where: { user_id: s.user_id },
      update: s,
      create: s,
    });
  }

  const careerBowling = [
    { user_id: owner.id,          matches: 2, overs_bowled: '3.0', runs_conceded: 18, wickets: 2, maidens: 1, economy: '6.00', strike_rate: '9.00', best_figures: '2/7',  dot_balls: 10, five_wkt_hauls: 0 },
    { user_id: scorer.id,         matches: 2, overs_bowled: '2.0', runs_conceded: 21, wickets: 1, maidens: 0, economy: '10.50', strike_rate: '12.00', best_figures: '1/21', dot_balls: 5, five_wkt_hauls: 0 },
    { user_id: playerUsers[0].id, matches: 1, overs_bowled: '2.0', runs_conceded: 24, wickets: 3, maidens: 0, economy: '12.00', strike_rate: '4.00',  best_figures: '3/24', dot_balls: 4, five_wkt_hauls: 0 },
    { user_id: playerUsers[1].id, matches: 1, overs_bowled: '1.0', runs_conceded: 20, wickets: 2, maidens: 0, economy: '20.00', strike_rate: '3.00',  best_figures: '2/20', dot_balls: 2, five_wkt_hauls: 0 },
    { user_id: playerUsers[4].id, matches: 1, overs_bowled: '1.0', runs_conceded: 12, wickets: 1, maidens: 0, economy: '12.00', strike_rate: '6.00',  best_figures: '1/12', dot_balls: 3, five_wkt_hauls: 0 },
    { user_id: playerUsers[5].id, matches: 1, overs_bowled: '1.0', runs_conceded: 9,  wickets: 1, maidens: 0, economy: '9.00',  strike_rate: '6.00',  best_figures: '1/9',  dot_balls: 3, five_wkt_hauls: 0 },
  ];
  for (const s of careerBowling) {
    await prisma.bowling_career_stats.upsert({
      where: { user_id: s.user_id },
      update: s,
      create: s,
    });
  }

  const careerFielding = [
    { user_id: owner.id,          catches: 2, dropped_catches: 0, run_outs: 0, stumpings: 0 },
    { user_id: scorer.id,         catches: 1, dropped_catches: 0, run_outs: 0, stumpings: 0 },
    { user_id: playerUsers[1].id, catches: 1, dropped_catches: 0, run_outs: 0, stumpings: 0 },
    { user_id: playerUsers[3].id, catches: 1, dropped_catches: 0, run_outs: 0, stumpings: 0 },
  ];
  for (const s of careerFielding) {
    await prisma.fielding_career_stats.upsert({
      where: { user_id: s.user_id },
      update: s,
      create: s,
    });
  }

  console.log('✅ Career stats seeded');

  console.log('\n📋 Test Accounts:');
  console.log('  owner   → username: seed_owner  | pass: Test@123  (session owner, scorer)');
  console.log('  scorer  → username: seed_scorer  | pass: Test@123  (batting team scorer)');
  console.log('  viewer  → username: seed_viewer  | pass: Test@123  (spectator, no team)');
  console.log('  players → seed_p1..seed_p8       | pass: Test@123');
  console.log('\n🏏 Sessions:');
  console.log('  SEED01 → Completed match  (Lions won by 12 runs, career stats populated)');
  console.log('  SEED02 → Live match       (Strikers 23/1 in 1.2 overs — innings 1 active)');
  console.log('  SEED03 → Lobby upcoming   (Weekend T20, 3 players joined)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
