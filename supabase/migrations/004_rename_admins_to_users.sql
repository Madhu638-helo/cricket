-- ============================================================
-- SP Cricket — Migration 004: Rename admins to users
-- Separates generic users from the system admin concept
-- ============================================================

-- Rename the table
ALTER TABLE admins RENAME TO users;

-- Rename primary key constraint
ALTER TABLE users RENAME CONSTRAINT admins_pkey TO users_pkey;

-- Rename unique constraint on username
ALTER TABLE users RENAME CONSTRAINT admins_username_key TO users_username_key;

-- Rename the admin_id column in sessions
ALTER TABLE sessions RENAME COLUMN admin_id TO owner_id;

-- Wait, the foreign key constraints in sessions, teams, matches, etc. need to be updated.
-- Actually, Postgres keeps track of foreign keys via OID, so renaming the table and columns doesn't break foreign keys.
-- But it's cleaner to rename the constraint names if they were explicitly named.
-- They were auto-named (e.g. `sessions_admin_id_fkey`). Let's rename them if they exist.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_admin_id_fkey') THEN
        ALTER TABLE sessions RENAME CONSTRAINT sessions_admin_id_fkey TO sessions_owner_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batting_career_stats_user_id_fkey') THEN
        -- user_id already points to users(id) now, but the constraint might be named admins
        -- Let's not touch constraint names unless they break.
    END IF;
END $$;
