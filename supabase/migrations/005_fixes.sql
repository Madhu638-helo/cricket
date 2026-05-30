-- ============================================================
-- SP Cricket — Migration 005: Schema fixes
-- ============================================================

-- 1. Make non_striker_id nullable (solo play support)
ALTER TABLE balls ALTER COLUMN non_striker_id DROP NOT NULL;

-- 2. Unique constraint: one player entry per user per session
--    Players table has UNIQUE(session_id, name) — add user_id uniqueness too
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_session_user_idx ON players (session_id, user_id) WHERE user_id IS NOT NULL;

-- 3. Add is_paused to matches if not already present (from migration 002)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;

-- 4. Rename sessions.admin_id -> owner_id if not already done by migration 004
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='admin_id') THEN
    ALTER TABLE sessions RENAME COLUMN admin_id TO owner_id;
  END IF;
END $$;
