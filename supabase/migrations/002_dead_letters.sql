-- Dead Letters puzzle table
CREATE TABLE IF NOT EXISTS dl_puzzles (
  date TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  consonants TEXT NOT NULL,
  vowel_count INTEGER NOT NULL,
  difficulty_score INTEGER NOT NULL CHECK (difficulty_score BETWEEN 1 AND 5),
  difficulty_rationale TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generation_attempts INTEGER NOT NULL DEFAULT 1,
  used_fallback BOOLEAN NOT NULL DEFAULT false
);

-- Add game_type to leaderboard (backward-compatible default)
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'loseit';

-- Dead Letters-specific leaderboard columns
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS incorrect_submissions INTEGER DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT false;

-- Index for game_type filtering
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_type_date ON leaderboard (game_type, date);
