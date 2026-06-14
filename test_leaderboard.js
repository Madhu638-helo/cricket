const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres.udffcsnfpncxgkeaabvu:Hcli0EDubo6Z3Kxd@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
  });
  await client.connect();
  
  const { rows: balls } = await client.query('SELECT batsman_id, bowler_id, runs_off_bat, extras, is_wicket, wicket_type, extra_type FROM balls');
  const { rows: players } = await client.query('SELECT id, name, user_id FROM players');
  
  const map = {};
  for (const b of balls) {
    if (!b.batsman_id) continue;
    const p = players.find(p => p.id === b.batsman_id);
    const key = p?.user_id || b.batsman_id;
    
    if (!map[key]) {
      map[key] = { name: p?.name ?? 'Unknown', runs: 0, balls: 0, fours: 0, sixes: 0 };
    }
    if (b.extra_type !== 'wide') {
      map[key].runs += b.runs_off_bat ?? 0;
      map[key].balls += 1;
      if ((b.runs_off_bat ?? 0) === 4) map[key].fours++;
      if ((b.runs_off_bat ?? 0) === 6) map[key].sixes++;
    }
  }
  
  const sorted = Object.values(map).sort((a, b) => b.runs - a.runs);
  console.log("Top 10 Leaders:");
  console.log(sorted.slice(0, 10));
  
  // Find duplicate names
  const nameCounts = {};
  for (const v of sorted) {
    nameCounts[v.name] = (nameCounts[v.name] || 0) + 1;
  }
  
  console.log("Duplicate names:");
  for (const [name, count] of Object.entries(nameCounts)) {
    if (count > 1) {
      console.log(name, count);
    }
  }
  
  await client.end();
}

test().catch(console.error);
