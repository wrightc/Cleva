/**
 * API client for Lambda function URL endpoints.
 * URLs are injected via Vite environment variables (VITE_*).
 */

import type { Puzzle, DLPuzzle, LeaderboardResponse, SubmitScorePayload, LeaderboardEntry, GameType } from '../types';

const URLS = {
  getPuzzle: import.meta.env.VITE_GET_PUZZLE_URL as string,
  submitScore: import.meta.env.VITE_SUBMIT_SCORE_URL as string,
  getLeaderboard: import.meta.env.VITE_GET_LEADERBOARD_URL as string,
  generatePuzzle: import.meta.env.VITE_GENERATE_PUZZLE_URL as string,
  getDLPuzzle: import.meta.env.VITE_GET_DL_PUZZLE_URL as string,
  generateDLPuzzle: import.meta.env.VITE_GENERATE_DL_PUZZLE_URL as string,
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  if (!url) {
    throw new Error('API endpoint URL is not configured. Check your environment variables.');
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json?.error) message = json.error;
    } catch {
      // Response wasn't JSON (e.g. HTML error page)
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

// ─── DropIt API ──────────────────────────────────────────────────────────────

export async function fetchPuzzle(date?: string): Promise<Puzzle> {
  const url = date ? `${URLS.getPuzzle}?date=${date}` : URLS.getPuzzle;
  return apiFetch<Puzzle>(url);
}

// ─── Dead Letters API ────────────────────────────────────────────────────────

export async function fetchDLPuzzle(date?: string): Promise<DLPuzzle> {
  const url = date ? `${URLS.getDLPuzzle}?date=${date}` : URLS.getDLPuzzle;
  return apiFetch<DLPuzzle>(url);
}

// ─── Shared API ──────────────────────────────────────────────────────────────

export async function submitScore(
  payload: SubmitScorePayload
): Promise<{ entry: LeaderboardEntry }> {
  return apiFetch<{ entry: LeaderboardEntry }>(URLS.submitScore, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchLeaderboard(
  date: string,
  limit = 25,
  offset = 0,
  gameType: GameType = 'loseit'
): Promise<LeaderboardResponse> {
  const url = `${URLS.getLeaderboard}?date=${date}&limit=${limit}&offset=${offset}&game_type=${gameType}`;
  return apiFetch<LeaderboardResponse>(url);
}
