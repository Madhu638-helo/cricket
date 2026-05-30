-- ============================================================
-- SP Cricket — Migration 003: Usernames
-- Add username column and drop unique constraint on name
-- ============================================================

-- Add username column
ALTER TABLE admins ADD COLUMN IF NOT EXISTS username TEXT;

-- For existing users, set username to their current name (converted to lowercase without spaces)
UPDATE admins SET username = LOWER(REPLACE(name, ' ', '_')) WHERE username IS NULL;

-- Make username unique and required
ALTER TABLE admins ADD CONSTRAINT admins_username_key UNIQUE (username);
ALTER TABLE admins ALTER COLUMN username SET NOT NULL;

-- Drop unique constraint on name (it's now just a display name)
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_name_key;
