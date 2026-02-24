-- Relax step_count constraint to allow Dead Letters submissions (step_count = 1)
-- The old constraint CHECK (step_count >= 6) was LoseIt-specific.
-- Game-specific validation is now handled in the Lambda function.
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_step_count_check;
ALTER TABLE leaderboard ADD CONSTRAINT leaderboard_step_count_check CHECK (step_count >= 1);

-- Add hints_used column (integer, 0-2) for Dead Letters
-- Replaces the boolean hint_used for more granular tracking
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;
