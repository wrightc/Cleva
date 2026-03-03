/**
 * Shared TypeScript types for Lambda functions.
 */

export type GameType = 'loseit' | 'dead-letters';

// ─── DropIt Puzzle ───────────────────────────────────────────────────────────

export interface Puzzle {
  date: string;           // ISO 8601 date string e.g. "2025-03-15"
  word: string;           // 8-letter uppercase starting word
  generated_at: string;
  generation_attempts: number;
  used_fallback: boolean;
  example_solution_path: string[];
}

// ─── Dead Letters Puzzle ─────────────────────────────────────────────────────

export interface DLPuzzle {
  date: string;
  word: string;
  consonants: string;
  vowel_count: number;
  difficulty_score: number;
  difficulty_rationale: string;
  generated_at: string;
  generation_attempts: number;
  used_fallback: boolean;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface AggregatedLeaderboardEntry {
  rank: number;
  user_id: string;
  player_name: string;
  total_time_ms: number;
  avg_time_ms: number;
  days_played: number;
  total_days: number;
  best_time_ms: number;
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  player_name: string;
  solve_time_ms: number;
  step_count: number;
  submitted_at: string;
  ip_hash: string;
  game_type: GameType;
  incorrect_submissions?: number;
  hint_used?: boolean;
  hints_used?: number;
  user_id?: string | null;
}

export interface LeaderboardEntryWithRank extends Omit<LeaderboardEntry, 'ip_hash'> {
  rank: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/** Lambda function URL event (HTTP request to a function URL) */
export interface FunctionUrlEvent {
  requestContext: {
    http: {
      method: string;
      sourceIp: string;
    };
  };
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

/** Lambda function URL response */
export interface FunctionUrlResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
