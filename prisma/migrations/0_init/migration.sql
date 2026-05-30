-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ball_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ball_id" UUID NOT NULL,
    "admin_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ball_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "innings_id" UUID NOT NULL,
    "over_number" INTEGER NOT NULL,
    "ball_number" INTEGER NOT NULL,
    "delivery_number" INTEGER NOT NULL,
    "batsman_id" UUID NOT NULL,
    "bowler_id" UUID NOT NULL,
    "non_striker_id" UUID NOT NULL,
    "runs_off_bat" INTEGER NOT NULL DEFAULT 0,
    "extras" INTEGER NOT NULL DEFAULT 0,
    "extra_type" TEXT,
    "is_wicket" BOOLEAN NOT NULL DEFAULT false,
    "wicket_type" TEXT,
    "fielder_id" UUID,
    "is_free_hit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batting_career_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "innings" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "balls_faced" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "fifties" INTEGER NOT NULL DEFAULT 0,
    "hundreds" INTEGER NOT NULL DEFAULT 0,
    "highest_score" INTEGER NOT NULL DEFAULT 0,
    "not_outs" INTEGER NOT NULL DEFAULT 0,
    "average" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "strike_rate" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batting_career_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bowling_career_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "overs_bowled" DECIMAL(8,1) NOT NULL DEFAULT 0,
    "runs_conceded" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "maidens" INTEGER NOT NULL DEFAULT 0,
    "dot_balls" INTEGER NOT NULL DEFAULT 0,
    "economy" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "strike_rate" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "best_figures" TEXT NOT NULL DEFAULT '-',
    "five_wkt_hauls" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bowling_career_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fielding_career_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "dropped_catches" INTEGER NOT NULL DEFAULT 0,
    "run_outs" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fielding_career_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "innings_number" INTEGER NOT NULL,
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "total_wickets" INTEGER NOT NULL DEFAULT 0,
    "total_balls" INTEGER NOT NULL DEFAULT 0,
    "total_extras" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "target" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "innings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "match_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "overs" INTEGER NOT NULL,
    "team1_id" UUID,
    "team2_id" UUID,
    "toss_winner_id" UUID,
    "toss_decision" TEXT,
    "batting_first" UUID,
    "result" TEXT,
    "winner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ground" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnerships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "innings_id" UUID NOT NULL,
    "batsman1_id" UUID NOT NULL,
    "batsman2_id" UUID NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "wicket_number" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "team_id" UUID,
    "name" TEXT NOT NULL,
    "is_scorer" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_joker" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" TEXT NOT NULL DEFAULT 'approved',

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DECIMAL(10,4) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(6) NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "owner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ground" TEXT,
    "match_date" DATE,
    "match_time" TIME(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "color" TEXT,
    "captain_id" UUID,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balls_innings_id_idx" ON "balls"("innings_id", "over_number", "ball_number");

-- CreateIndex
CREATE UNIQUE INDEX "batting_career_stats_user_id_key" ON "batting_career_stats"("user_id");

-- CreateIndex
CREATE INDEX "batting_stats_runs_idx" ON "batting_career_stats"("runs" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bowling_career_stats_user_id_key" ON "bowling_career_stats"("user_id");

-- CreateIndex
CREATE INDEX "bowling_stats_wickets_idx" ON "bowling_career_stats"("wickets" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "fielding_career_stats_user_id_key" ON "fielding_career_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "innings_match_id_innings_number_key" ON "innings"("match_id", "innings_number");

-- CreateIndex
CREATE INDEX "leaderboards_rank_idx" ON "leaderboards"("category", "period", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_user_id_category_period_key" ON "leaderboards"("user_id", "category", "period");

-- CreateIndex
CREATE UNIQUE INDEX "players_session_id_name_key" ON "players"("session_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_code_key" ON "sessions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ball_overrides" ADD CONSTRAINT "ball_overrides_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ball_overrides" ADD CONSTRAINT "ball_overrides_ball_id_fkey" FOREIGN KEY ("ball_id") REFERENCES "balls"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balls" ADD CONSTRAINT "balls_batsman_id_fkey" FOREIGN KEY ("batsman_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balls" ADD CONSTRAINT "balls_bowler_id_fkey" FOREIGN KEY ("bowler_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balls" ADD CONSTRAINT "balls_fielder_id_fkey" FOREIGN KEY ("fielder_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balls" ADD CONSTRAINT "balls_innings_id_fkey" FOREIGN KEY ("innings_id") REFERENCES "innings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "balls" ADD CONSTRAINT "balls_non_striker_id_fkey" FOREIGN KEY ("non_striker_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batting_career_stats" ADD CONSTRAINT "batting_career_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bowling_career_stats" ADD CONSTRAINT "bowling_career_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fielding_career_stats" ADD CONSTRAINT "fielding_career_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "innings" ADD CONSTRAINT "innings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "innings" ADD CONSTRAINT "innings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_batting_first_fkey" FOREIGN KEY ("batting_first") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_toss_winner_id_fkey" FOREIGN KEY ("toss_winner_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_batsman1_id_fkey" FOREIGN KEY ("batsman1_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_batsman2_id_fkey" FOREIGN KEY ("batsman2_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_innings_id_fkey" FOREIGN KEY ("innings_id") REFERENCES "innings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

