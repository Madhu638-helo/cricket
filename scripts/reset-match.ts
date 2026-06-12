import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── EDIT THIS to match your session code ────────────────────────────────────
const SESSION_CODE = process.argv[2] || '4TKYJO';
// ────────────────────────────────────────────────────────────────────────────

async function resetMatch(code: string) {
  console.log(`\n🔄 Resetting match for session code: ${code}\n`);

  // 1. Find session
  const { data: session, error: sessErr } = await (supabase.from('sessions') as any)
    .select('id').eq('code', code).single();
  if (sessErr || !session) {
    console.error('❌ Session not found:', sessErr?.message);
    process.exit(1);
  }
  console.log(`✅ Found session: ${session.id}`);

  // 2. Find match(es) in this session
  const { data: matches } = await (supabase.from('matches') as any)
    .select('id, status').eq('session_id', session.id);
  if (!matches || matches.length === 0) {
    console.error('❌ No matches found for this session');
    process.exit(1);
  }
  const matchIds = matches.map((m: any) => m.id);
  console.log(`✅ Found ${matches.length} match(es): ${matchIds.join(', ')}`);

  // 3. Find all innings for these matches
  const { data: innings } = await (supabase.from('innings') as any)
    .select('id').in('match_id', matchIds);
  const inningsIds = (innings ?? []).map((i: any) => i.id);
  console.log(`✅ Found ${inningsIds.length} innings`);

  // 4. Delete all balls for these innings
  if (inningsIds.length > 0) {
    const { error: ballErr } = await (supabase.from('balls') as any)
      .delete().in('innings_id', inningsIds);
    if (ballErr) console.warn('  ⚠️  Ball delete error:', ballErr.message);
    else console.log('  🗑️  All balls deleted');
  }

  // 5. Delete all partnerships for these innings
  if (inningsIds.length > 0) {
    const { error: partErr } = await (supabase.from('partnerships') as any)
      .delete().in('innings_id', inningsIds);
    if (partErr) console.warn('  ⚠️  Partnership delete error:', partErr.message);
    else console.log('  🗑️  All partnerships deleted');
  }

  // 6. Delete all score_tickers for these matches
  if (matchIds.length > 0) {
    const { error: tickErr } = await (supabase.from('score_tickers') as any)
      .delete().in('match_id', matchIds);
    if (tickErr) console.warn('  ⚠️  Score ticker delete error:', tickErr.message);
    else console.log('  🗑️  All score tickers deleted');
  }

  // 7. Delete all innings
  if (inningsIds.length > 0) {
    const { error: innErr } = await (supabase.from('innings') as any)
      .delete().in('id', inningsIds);
    if (innErr) console.warn('  ⚠️  Innings delete error:', innErr.message);
    else console.log('  🗑️  All innings deleted');
  }

  // 8. Reset match status back to 'toss' and clear result/winner fields
  for (const matchId of matchIds) {
    const { error: matchErr } = await (supabase.from('matches') as any)
      .update({
        status: 'toss',
        result: null,
        winner_id: null,
        is_paused: false,
      })
      .eq('id', matchId);
    if (matchErr) console.warn(`  ⚠️  Match reset error for ${matchId}:`, matchErr.message);
    else console.log(`  ✅ Match ${matchId} reset to 'toss'`);
  }

  console.log('\n🏏 Match reset complete! Navigate to the Toss screen in the app.\n');
}

resetMatch(SESSION_CODE).catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
