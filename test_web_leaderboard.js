const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres.udffcsnfpncxgkeaabvu:Hcli0EDubo6Z3Kxd@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
  });
  await client.connect();
  
  const { rows: allUsers } = await client.query('SELECT id, name, batting_style, player_role FROM users');
  const { rows: batStats } = await client.query('SELECT * FROM batting_career_stats');
  
  const statsMap = new Map((batStats || []).map((r) => [r.user_id, r]));

  const rankings = allUsers
    .map(u => {
      const s = statsMap.get(u.id);
      return {
        userId: u.id,
        name: u.name || 'Player',
        runs: s?.runs || 0,
      };
    })
    .sort((a, b) => b.runs - a.runs)
    .filter(r => r.runs > 0);
    
  console.log("Top 5 Web Leaders:");
  console.log(rankings.slice(0, 5));
  
  // Find duplicates
  const nameCounts = {};
  for (const v of rankings) {
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
