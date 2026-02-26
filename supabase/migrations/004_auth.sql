-- 004_auth.sql — Profiles table + leaderboard user_id column
-- Run in Supabase SQL editor (non-breaking, additive only)

-- ─── Profiles table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique display name
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_idx
  ON profiles (lower(display_name));

-- Display name validation: 2-20 chars, alphanumeric + spaces
ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_length
  CHECK (char_length(display_name) BETWEEN 2 AND 20);

ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_format
  CHECK (display_name ~ '^[a-zA-Z0-9 ]+$');

-- RLS: anyone can read profiles, only owner can insert/update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── Leaderboard: add user_id column ────────────────────────────────────────

ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for authenticated dedup: one submission per user per day per game
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_date_game_idx
  ON leaderboard (user_id, date, game_type)
  WHERE user_id IS NOT NULL;
