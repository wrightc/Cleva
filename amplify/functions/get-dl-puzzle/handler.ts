/**
 * GET /get-dl-puzzle?date=YYYY-MM-DD
 *
 * Returns the Dead Letters puzzle for the specified date (defaults to today Eastern).
 * Returns scrambled consonants, vowel count, answer hash, and correct consonant order.
 * NEVER exposes the actual word (with vowels).
 *
 * Note: correctConsonants is visible in network traffic. For Phase 1 this is acceptable —
 * players who inspect the response can see the consonant order but not the full word.
 */

import { createHash } from 'crypto';
import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent } from '../shared/types.js';

/**
 * Deterministic shuffle of a string using a simple seed from the date.
 * Same date always produces the same scramble for all players.
 */
function deterministicShuffle(str: string, seed: string): string {
  const chars = str.split('');

  // Simple hash from the date seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  // Fisher-Yates shuffle with seeded pseudo-random
  for (let i = chars.length - 1; i > 0; i--) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
    const j = hash % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const dateParam = event.queryStringParameters?.date;

  // Default to today in Eastern time
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('dl_puzzles')
      .select('date, consonants, vowel_count')
      .eq('date', date)
      .single();

    if (error || !data) {
      return jsonResponse(404, { error: `No Dead Letters puzzle found for ${date}` });
    }

    // Scramble consonants deterministically
    const scrambled = deterministicShuffle(data.consonants, date);

    // Create SHA-256 hash of correct consonants for client-side validation
    const answerHash = createHash('sha256').update(data.consonants).digest('hex');

    return jsonResponse(200, {
      date: data.date,
      consonants: scrambled,
      vowelCount: data.vowel_count,
      answerHash,
      correctConsonants: data.consonants,
    });
  } catch (err) {
    console.error('get-dl-puzzle error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
