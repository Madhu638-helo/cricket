-- ============================================================
-- SP Cricket — Migration 002: Career Statistics Tables
-- Run in Supabase SQL editor AFTER 001_initial.sql
-- ============================================================

-- Batting career stats (one row per user/admin)
CREATE TABLE IF NOT EXISTS batting_career_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  matches       INT NOT NULL DEFAULT 0,
  innings       INT NOT NULL DEFAULT 0,
  runs          INT NOT NULL DEFAULT 0,
  balls_faced   INT NOT NULL DEFAULT 0,
  fours         INT NOT NULL DEFAULT 0,
  sixes         INT NOT NULL DEFAULT 0,
  fifties       INT NOT NULL DEFAULT 0,
  hundreds      INT NOT NULL DEFAULT 0,
  highest_score INT NOT NULL DEFAULT 0,
  not_outs      INT NOT NULL DEFAULT 0,
  average       NUMERIC(8,2) NOT NULL DEFAULT 0,
  strike_rate   NUMERIC(8,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Bowling career stats
CREATE TABLE IF NOT EXISTS bowling_career_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  matches         INT NOT NULL DEFAULT 0,
  overs_bowled    NUMERIC(8,1) NOT NULL DEFAULT 0,
  runs_conceded   INT NOT NULL DEFAULT 0,
  wickets         INT NOT NULL DEFAULT 0,
  maidens         INT NOT NULL DEFAULT 0,
  dot_balls       INT NOT NULL DEFAULT 0,
  economy         NUMERIC(8,2) NOT NULL DEFAULT 0,
  strike_rate     NUMERIC(8,2) NOT NULL DEFAULT 0,
  best_figures    TEXT NOT NULL DEFAULT '-',
  five_wkt_hauls  INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Fielding career stats
CREATE TABLE IF NOT EXISTS fielding_career_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  catches         INT NOT NULL DEFAULT 0,
  dropped_catches INT NOT NULL DEFAULT 0,
  run_outs        INT NOT NULL DEFAULT 0,
  stumpings       INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Leaderboard cache (materialized ranking snapshots)
CREATE TABLE IF NOT EXISTS leaderboards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN ('batting','bowling','allrounder')),
  period      TEXT NOT NULL CHECK (period IN ('weekly','monthly','yearly','all_time')),
  rank        INT NOT NULL,
  score       NUMERIC(10,4) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, period)
);

-- Rankings history (for trend tracking)
CREATE TABLE IF NOT EXISTS rankings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  period      TEXT NOT NULL,
  rank        INT NOT NULL,
  score       NUMERIC(10,4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES admins(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session schema extensions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ground TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS match_time TIME;

-- Teams extensions
ALTER TABLE teams ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Players extensions
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' 
  CHECK (approval_status IN ('pending','approved','rejected'));

-- Matches extensions  
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ground TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;

-- Extend wicket_type to include all 10 dismissals
-- Note: need to drop + recreate constraint
ALTER TABLE balls DROP CONSTRAINT IF EXISTS balls_wicket_type_check;
ALTER TABLE balls ADD CONSTRAINT balls_wicket_type_check 
  CHECK (wicket_type IN (
    'caught','bowled','lbw','runout','stumped','hitwicket',
    'retiredhurt','retiredout','timedout','obstructingfield'
  ));

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS batting_stats_runs_idx ON batting_career_stats (runs DESC);
CREATE INDEX IF NOT EXISTS bowling_stats_wickets_idx ON bowling_career_stats (wickets DESC);
CREATE INDEX IF NOT EXISTS leaderboards_rank_idx ON leaderboards (category, period, rank);

-- Disable RLS for new tables (managed via API layer)
ALTER TABLE batting_career_stats  DISABLE ROW LEVEL SECURITY;
ALTER TABLE bowling_career_stats  DISABLE ROW LEVEL SECURITY;
ALTER TABLE fielding_career_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards          DISABLE ROW LEVEL SECURITY;
ALTER TABLE rankings              DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for leaderboards
-- ALTER PUBLICATION supabase_realtime ADD TABLE leaderboards, notifications;
