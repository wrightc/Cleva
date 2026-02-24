/**
 * POST /submit-score
 *
 * Body: { playerName, solveTimeMs, stepCount, date, gameType?, incorrectSubmissions?, hintUsed? }
 *
 * Validates input, hashes the player's IP, enforces one-submission-per-IP-per-day-per-game,
 * and inserts the leaderboard entry.
 */

import { createHash } from 'crypto';
import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent, GameType } from '../shared/types.js';

// Basic profanity blocklist (extend as needed)
const PROFANITY_BLOCKLIST = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'piss'];

function containsProfanity(name: string): boolean {
  const lower = name.toLowerCase();
  return PROFANITY_BLOCKLIST.some((word) => lower.includes(word));
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function getClientIp(event: FunctionUrlEvent): string {
  return (
    event.headers?.['cf-connecting-ip'] ||
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.requestContext?.http?.sourceIp ||
    'unknown'
  );
}

const VALID_GAME_TYPES: GameType[] = ['loseit', 'dead-letters'];

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { playerName, solveTimeMs, stepCount, date, gameType, incorrectSubmissions, hintUsed } = body;

  // Validate game type
  const game = (typeof gameType === 'string' && VALID_GAME_TYPES.includes(gameType as GameType))
    ? gameType as GameType
    : 'loseit';

  // Validate player name
  if (typeof playerName !== 'string') {
    return jsonResponse(400, { error: 'playerName must be a string' });
  }
  const trimmedName = playerName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 20) {
    return jsonResponse(400, { error: 'Player name must be 2–20 characters' });
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmedName)) {
    return jsonResponse(400, { error: 'Player name may only contain letters, numbers, and spaces' });
  }
  if (containsProfanity(trimmedName)) {
    return jsonResponse(400, { error: 'Player name contains disallowed content' });
  }

  // Validate solveTimeMs
  if (typeof solveTimeMs !== 'number' || solveTimeMs <= 0 || !Number.isInteger(solveTimeMs)) {
    return jsonResponse(400, { error: 'solveTimeMs must be a positive integer' });
  }

  // Validate stepCount (only required for LoseIt)
  if (game === 'loseit') {
    if (typeof stepCount !== 'number' || !Number.isInteger(stepCount) || stepCount < 6) {
      return jsonResponse(400, { error: 'stepCount must be an integer >= 6 for LoseIt' });
    }
  }

  // Validate date
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonResponse(400, { error: 'date must be in YYYY-MM-DD format' });
  }

  const supabase = getSupabaseClient();

  // Verify the puzzle exists for this date (check correct table based on game)
  const puzzleTable = game === 'dead-letters' ? 'dl_puzzles' : 'puzzles';
  const { data: puzzle } = await supabase
    .from(puzzleTable)
    .select('date')
    .eq('date', date)
    .single();

  if (!puzzle) {
    return jsonResponse(404, { error: `No puzzle found for date ${date}` });
  }

  const ip = getClientIp(event);
  const ipHash = hashIp(ip);

  // Soft duplicate check: one submission per IP per day per game
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('id')
    .eq('ip_hash', ipHash)
    .eq('date', date)
    .eq('game_type', game)
    .single();

  if (existing) {
    return jsonResponse(409, { error: 'You have already submitted a score for today' });
  }

  // Build insert row
  const row: Record<string, unknown> = {
    date,
    player_name: trimmedName,
    solve_time_ms: solveTimeMs,
    step_count: stepCount,
    submitted_at: new Date().toISOString(),
    ip_hash: ipHash,
    game_type: game,
  };

  // Dead Letters-specific fields
  if (game === 'dead-letters') {
    row.incorrect_submissions = typeof incorrectSubmissions === 'number' ? incorrectSubmissions : 0;
    row.hint_used = typeof hintUsed === 'boolean' ? hintUsed : false;
  }

  // Insert the leaderboard entry
  const { data: entry, error } = await supabase
    .from('leaderboard')
    .insert(row)
    .select('id, date, player_name, solve_time_ms, step_count, submitted_at, game_type, incorrect_submissions, hint_used')
    .single();

  if (error) {
    console.error('submit-score insert error:', error);
    return jsonResponse(500, { error: 'Failed to save score' });
  }

  return jsonResponse(201, { entry });
};
