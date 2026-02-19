/**
 * API client for Lambda function URL endpoints.
 * URLs are injected via Vite environment variables (VITE_*).
 */

import type { Puzzle, LeaderboardResponse, SubmitScorePayload, LeaderboardEntry } from '../types';

const URLS = {
  getPuzzle: import.meta.env.VITE_GET_PUZZLE_URL as string,
  submitScore: import.meta.env.VITE_SUBMIT_SCORE_URL as string,
  getLeaderboard: import.meta.env.VITE_GET_LEADERBOARD_URL as string,
  generatePuzzle: import.meta.env.VITE_GENERATE_PUZZLE_URL as string,
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json as T;
}

export async function fetchPuzzle(date?: string): Promise<Puzzle> {
  const url = date ? `${URLS.getPuzzle}?date=${date}` : URLS.getPuzzle;
  return apiFetch<Puzzle>(url);
}

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
  offset = 0
): Promise<LeaderboardResponse> {
  const url = `${URLS.getLeaderboard}?date=${date}&limit=${limit}&offset=${offset}`;
  return apiFetch<LeaderboardResponse>(url);
}
