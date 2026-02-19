export interface Puzzle {
  date: string;   // YYYY-MM-DD
  word: string;   // 7-letter uppercase starting word
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  player_name: string;
  solve_time_ms: number;
  step_count: number;
  submitted_at: string;
  rank: number;
}

export interface LeaderboardResponse {
  date: string;
  entries: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitScorePayload {
  playerName: string;
  solveTimeMs: number;
  stepCount: number;
  date: string;
}

export type GameStatus =
  | 'loading'
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
}

/** Stored in localStorage when a puzzle is completed */
export interface CompletedGame {
  date: string;
  chain: string[];
  elapsedMs: number;
  submitted: boolean;
  playerName?: string;
}
