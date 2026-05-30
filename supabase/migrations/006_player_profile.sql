-- ============================================================
-- SP Cricket — Migration 006: Player profile fields
-- ============================================================

-- Cricket profile fields on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS batting_style  TEXT DEFAULT 'right_hand'
  CHECK (batting_style IN ('right_hand','left_hand'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS bowling_style  TEXT DEFAULT 'none'
  CHECK (bowling_style IN (
    'right_arm_fast','right_arm_medium_fast','right_arm_medium',
    'right_arm_off_spin','right_arm_leg_spin',
    'left_arm_fast','left_arm_medium_fast','left_arm_medium',
    'left_arm_orthodox','left_arm_wrist_spin',
    'none'
  ));

ALTER TABLE users ADD COLUMN IF NOT EXISTS player_role    TEXT DEFAULT 'batsman'
  CHECK (player_role IN ('batsman','bowler','allrounder','wicketkeeper_batsman'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS batting_position TEXT DEFAULT 'middle_order'
  CHECK (batting_position IN ('opener','top_order','middle_order','lower_order','tail_ender'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS jersey_number  SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio            TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ground TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth  DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url     TEXT;

-- Index for leaderboard joins — users name lookup
CREATE INDEX IF NOT EXISTS users_id_idx ON users (id);
