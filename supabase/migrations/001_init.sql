-- The Shrinking Word — Initial Database Schema
-- Run in Supabase SQL Editor or via Supabase CLI

-- Daily puzzles
CREATE TABLE IF NOT EXISTS puzzles (
  date                  DATE        PRIMARY KEY,
  word                  TEXT        NOT NULL CHECK (char_length(word) = 7),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generation_attempts   INTEGER     NOT NULL DEFAULT 1,
  used_fallback         BOOLEAN     NOT NULL DEFAULT FALSE,
  example_solution_path JSONB       NOT NULL  -- array of strings, for internal use only
);

COMMENT ON TABLE puzzles IS 'One row per calendar day. example_solution_path is never exposed to the client.';

-- Player leaderboard entries
CREATE TABLE IF NOT EXISTS leaderboard (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date           DATE        NOT NULL REFERENCES puzzles(date) ON DELETE CASCADE,
  player_name    TEXT        NOT NULL CHECK (char_length(player_name) BETWEEN 2 AND 20),
  solve_time_ms  INTEGER     NOT NULL CHECK (solve_time_ms > 0),
  step_count     INTEGER     NOT NULL CHECK (step_count >= 6),  -- minimum 6 steps for 7→1
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash        TEXT        NOT NULL  -- SHA-256 of IP, never plaintext
);

COMMENT ON TABLE leaderboard IS 'Leaderboard entries. ip_hash is a one-way SHA-256 hash for soft duplicate detection.';

-- Index for fast leaderboard queries ordered by: time asc, steps asc, submission asc
CREATE INDEX IF NOT EXISTS leaderboard_ranking_idx
  ON leaderboard (date, solve_time_ms ASC, step_count ASC, submitted_at ASC);

-- Index for per-ip-per-day duplicate check
CREATE INDEX IF NOT EXISTS leaderboard_ip_date_idx
  ON leaderboard (ip_hash, date);
