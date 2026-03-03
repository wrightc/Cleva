export type GameType = 'loseit' | 'dead-letters';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

// ─── DropIt Types ────────────────────────────────────────────────────────────

export interface Puzzle {
  date: string;   // YYYY-MM-DD
  word: string;   // 8-letter uppercase starting word
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  player_name: string;
  solve_time_ms: number;
  step_count: number;
  submitted_at: string;
  rank: number;
  game_type?: GameType;
  incorrect_submissions?: number;
  hint_used?: boolean;
  hints_used?: number;
  user_id?: string | null;
}

export interface LeaderboardResponse {
  date: string;
  entries: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

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

export interface AggregatedLeaderboardResponse {
  period: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalDays: number;
  entries: AggregatedLeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitScorePayload {
  playerName: string;
  solveTimeMs: number;
  stepCount: number;
  date: string;
  gameType?: GameType;
  incorrectSubmissions?: number;
  hintUsed?: boolean;
  hintsUsed?: number;
}

export type GameStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'complete'
  | 'error'
  | 'already-played';

export interface GameState {
  puzzle: Puzzle | null;
  chain: string[];               // [startWord, ...steps, singleLetter]
  currentWord: string;
  selectedLetterIndex: number | null;
  status: GameStatus;
  errorMessage: string | null;   // inline move error (not fatal)
  fatalError: string | null;     // API/load error
  elapsedMs: number;
  penaltyUntil: number | null;   // epoch ms when 2-second penalty expires
  isStuck: boolean;              // no valid next moves exist
}

/** Stored in localStorage when a puzzle is completed */
export interface CompletedGame {
  date: string;
  chain: string[];
  elapsedMs: number;
  submitted: boolean;
  playerName?: string;
}

// ─── Dead Letters Types ──────────────────────────────────────────────────────

export interface DLPuzzle {
  date: string;              // YYYY-MM-DD
  word: string;              // the full word (revealed after completion)
  consonants: string;        // scrambled consonants (uppercase)
  vowelCount: number;
  answerHash: string;        // SHA-256 of correct consonant order
  correctConsonants: string; // correct consonant order (for hints + validation)
}

export interface DLTile {
  id: string;          // unique tile id (e.g., "tile-0")
  letter: string;      // single consonant
  isLocked: boolean;   // locked by hint — cannot be moved
}

export type DLGameStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'complete'
  | 'error'
  | 'already-played';

export interface DLGameState {
  puzzle: DLPuzzle | null;
  trayTiles: DLTile[];                // tiles not yet placed in slots
  slotTiles: (DLTile | null)[];       // answer slots (same length as consonants)
  status: DLGameStatus;
  incorrectSubmissions: number;
  hintsUsed: number;                  // 0, 1, or 2 hints used
  elapsedMs: number;
  penaltySeconds: number;             // total penalty seconds accumulated
  errorMessage: string | null;
  fatalError: string | null;
}

export interface DLCompletedGame {
  date: string;
  word: string;              // the revealed word
  consonants: string;        // the original consonant string
  elapsedMs: number;         // raw solve time
  penaltySeconds: number;    // total penalties
  incorrectSubmissions: number;
  hintsUsed: number;         // 0, 1, or 2
  submitted: boolean;
  playerName?: string;
}
