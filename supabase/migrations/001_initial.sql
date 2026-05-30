-- ============================================================
-- Cricket Score Pro — Supabase PostgreSQL Migration 001
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Admins (custom auth)
CREATE TABLE admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions (one per day/tournament)
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(6) UNIQUE NOT NULL,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','active','finished')),
  admin_id    UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teams (2 per session, reusable across matches)
CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players (join with name + code)
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  is_scorer   BOOLEAN NOT NULL DEFAULT false,
  is_joker    BOOLEAN NOT NULL DEFAULT false,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, name)
);

-- One scorer per team: partial unique index
CREATE UNIQUE INDEX one_scorer_per_team ON players (team_id) WHERE is_scorer = true;

-- Matches (multiple per session)
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  match_number    INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'setup'
                  CHECK (status IN ('setup','toss','innings_1','innings_break','innings_2','result')),
  overs           INT NOT NULL CHECK (overs > 0),
  team1_id        UUID REFERENCES teams(id),
  team2_id        UUID REFERENCES teams(id),
  toss_winner_id  UUID REFERENCES teams(id),
  toss_decision   TEXT CHECK (toss_decision IN ('bat','bowl')),
  batting_first   UUID REFERENCES teams(id),
  result          TEXT,
  winner_id       UUID REFERENCES teams(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Innings (1 or 2 per match)
CREATE TABLE innings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id),
  innings_number  INT NOT NULL CHECK (innings_number IN (1, 2)),
  total_runs      INT NOT NULL DEFAULT 0,
  total_wickets   INT NOT NULL DEFAULT 0,
  total_balls     INT NOT NULL DEFAULT 0,   -- legal deliveries only
  total_extras    INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','complete')),
  target          INT,                       -- set when innings 1 completes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, innings_number)
);

-- Balls (every delivery)
CREATE TABLE balls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id        UUID NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  over_number       INT NOT NULL,             -- 0-indexed
  ball_number       INT NOT NULL,             -- legal ball in over (1-6)
  delivery_number   INT NOT NULL,             -- actual delivery including extras
  batsman_id        UUID NOT NULL REFERENCES players(id),
  bowler_id         UUID NOT NULL REFERENCES players(id),
  non_striker_id    UUID NOT NULL REFERENCES players(id),
  runs_off_bat      INT NOT NULL DEFAULT 0,
  extras            INT NOT NULL DEFAULT 0,
  extra_type        TEXT CHECK (extra_type IN ('wide','noball','bye','legbye','penalty')),
  is_wicket         BOOLEAN NOT NULL DEFAULT false,
  wicket_type       TEXT CHECK (wicket_type IN ('caught','bowled','lbw','runout','stumped','hitwicket','retiredhurt')),
  fielder_id        UUID REFERENCES players(id),
  is_free_hit       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast innings ball lookup
CREATE INDEX balls_innings_id_idx ON balls (innings_id, over_number, ball_number);

-- Partnerships
CREATE TABLE partnerships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id      UUID NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  batsman1_id     UUID NOT NULL REFERENCES players(id),
  batsman2_id     UUID NOT NULL REFERENCES players(id),
  runs            INT NOT NULL DEFAULT 0,
  balls           INT NOT NULL DEFAULT 0,
  wicket_number   INT,                        -- null = current/ongoing
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for score overrides by admin
CREATE TABLE ball_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ball_id     UUID NOT NULL REFERENCES balls(id),
  admin_id    UUID REFERENCES admins(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Session standings view (W/L/NRR per team per session)
CREATE VIEW session_standings AS
WITH match_results AS (
  SELECT
    m.session_id,
    m.id AS match_id,
    i.team_id,
    i.total_runs,
    i.total_balls,
    i.total_wickets,
    m.overs,
    m.winner_id,
    m.status
  FROM matches m
  JOIN innings i ON i.match_id = m.id
  WHERE m.status = 'result'
),
team_stats AS (
  SELECT
    session_id,
    team_id,
    COUNT(DISTINCT match_id) AS played,
    COUNT(DISTINCT CASE WHEN winner_id = team_id THEN match_id END) AS won,
    COUNT(DISTINCT CASE WHEN winner_id IS NOT NULL AND winner_id != team_id THEN match_id END) AS lost,
    ROUND(
      SUM(total_runs)::NUMERIC / NULLIF(SUM(total_balls), 0) * 6
      - (
        SELECT ROUND(SUM(r.total_runs)::NUMERIC / NULLIF(SUM(r.total_balls), 0) * 6, 4)
        FROM match_results r
        WHERE r.session_id = match_results.session_id
          AND r.team_id != match_results.team_id
          AND r.match_id IN (SELECT match_id FROM match_results WHERE team_id = match_results.team_id)
      ),
    4) AS nrr
  FROM match_results
  GROUP BY session_id, team_id
)
SELECT
  ts.*,
  (ts.won * 2) AS points
FROM team_stats ts;

-- ============================================================
-- ROW LEVEL SECURITY (Disabled for custom auth, managed in API)
-- ============================================================

ALTER TABLE admins        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams         DISABLE ROW LEVEL SECURITY;
ALTER TABLE players       DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches       DISABLE ROW LEVEL SECURITY;
ALTER TABLE innings       DISABLE ROW LEVEL SECURITY;
ALTER TABLE balls         DISABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships  DISABLE ROW LEVEL SECURITY;
ALTER TABLE ball_overrides DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- REALTIME — enable for key tables
-- ============================================================
-- Run these in Supabase Dashboard > Database > Replication
-- or via: ALTER PUBLICATION supabase_realtime ADD TABLE balls, innings, matches, players, sessions;
