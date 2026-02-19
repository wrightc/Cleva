/**
 * POST /submit-score
 *
 * Body: { playerName: string, solveTimeMs: number, stepCount: number, date: string }
 *
 * Validates input, hashes the player's IP, enforces one-submission-per-IP-per-day,
 * and inserts the leaderboard entry.
 */

import { createHash } from 'crypto';
import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent } from '../shared/types.js';

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

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Parse body
  let body: { playerName?: unknown; solveTimeMs?: unknown; stepCount?: unknown; date?: unknown };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { playerName, solveTimeMs, stepCount, date } = body;

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

  // Validate stepCount (minimum 6 for a 7-letter word reduced to 1 letter)
  if (typeof stepCount !== 'number' || stepCount < 6 || !Number.isInteger(stepCount)) {
    return jsonResponse(400, { error: 'stepCount must be an integer >= 6' });
  }

  // Validate date
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonResponse(400, { error: 'date must be in YYYY-MM-DD format' });
  }

  const supabase = getSupabaseClient();

  // Verify the puzzle exists for this date
  const { data: puzzle } = await supabase
    .from('puzzles')
    .select('date')
    .eq('date', date)
    .single();

  if (!puzzle) {
    return jsonResponse(404, { error: `No puzzle found for date ${date}` });
  }

  const ip = getClientIp(event);
  const ipHash = hashIp(ip);

  // Soft duplicate check: one submission per IP per day
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('id')
    .eq('ip_hash', ipHash)
    .eq('date', date)
    .single();

  if (existing) {
    return jsonResponse(409, { error: 'You have already submitted a score for today' });
  }

  // Insert the leaderboard entry
  const { data: entry, error } = await supabase
    .from('leaderboard')
    .insert({
      date,
      player_name: trimmedName,
      solve_time_ms: solveTimeMs,
      step_count: stepCount,
      submitted_at: new Date().toISOString(),
      ip_hash: ipHash,
    })
    .select('id, date, player_name, solve_time_ms, step_count, submitted_at')
    .single();

  if (error) {
    console.error('submit-score insert error:', error);
    return jsonResponse(500, { error: 'Failed to save score' });
  }

  return jsonResponse(201, { entry });
};
