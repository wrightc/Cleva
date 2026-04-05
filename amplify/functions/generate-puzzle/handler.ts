/**
 * generate-puzzle Lambda handler
 *
 * Invoked by:
 *   1. AWS EventBridge Scheduler daily at 05:00 UTC (midnight ET)
 *   2. HTTP POST with x-admin-secret header (manual trigger for development/testing)
 *
 * Algorithm:
 *   1. Pick a random word from the pre-computed pool of solvable 8-letter words
 *   2. Skip words used in the last 30 days
 *   3. Re-validate with BFS as a sanity check
 *   4. Store in Supabase
 */

import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import { validateWord } from '../shared/validator.js';
import { SOLVABLE_8_LETTER_WORDS } from '../shared/solvable-words.js';
import type { FunctionUrlEvent } from '../shared/types.js';

interface GenerationResult {
  date: string;
  word: string;
  generation_attempts: number;
  used_fallback: boolean;
  example_solution_path: string[];
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function generatePuzzle(): Promise<GenerationResult> {
  const supabase = getSupabaseClient();

  // Target date: today in Eastern time (cron fires at 05:00 UTC = midnight ET)
  const targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // Fetch words used in the last 30 days to avoid repeats
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const { data: recentPuzzles } = await supabase
    .from('puzzles')
    .select('word')
    .gte('date', cutoffDate);
  const recentWordSet = new Set((recentPuzzles ?? []).map(p => p.word as string));

  // Shuffle the pool and pick the first word not used recently
  const candidates = shuffle([...SOLVABLE_8_LETTER_WORDS]);
  let attempts = 0;

  for (const word of candidates) {
    attempts++;

    if (recentWordSet.has(word)) {
      continue;
    }

    // Sanity-check BFS validation (should always pass for pre-computed words)
    const validation = validateWord(word);
    if (!validation.solvable || !validation.path) {
      console.warn(`Pre-computed word "${word}" failed re-validation: ${validation.reason}`);
      continue;
    }

    console.log(`Selected word "${word}" after checking ${attempts} candidates`);

    const { error } = await supabase.from('puzzles').upsert({
      date: targetDate,
      word,
      generated_at: new Date().toISOString(),
      generation_attempts: attempts,
      used_fallback: false,
      example_solution_path: validation.path,
    });

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    return {
      date: targetDate,
      word,
      generation_attempts: attempts,
      used_fallback: false,
      example_solution_path: validation.path,
    };
  }

  throw new Error(
    `All ${SOLVABLE_8_LETTER_WORDS.length} words were used in the last 30 days. ` +
    'This should not happen with a pool of 276 words.'
  );
}

export const handler = async (event: FunctionUrlEvent | Record<string, unknown>) => {
  // Detect if invoked by EventBridge (scheduled event has no requestContext.http)
  const isScheduledEvent = !('requestContext' in event) ||
    !((event as FunctionUrlEvent).requestContext?.http);

  // For HTTP invocations, require admin secret
  if (!isScheduledEvent) {
    const httpEvent = event as FunctionUrlEvent;

    if (httpEvent.requestContext?.http?.method === 'OPTIONS') {
      return jsonResponse(200, {});
    }

    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = httpEvent.headers?.['x-admin-secret'];

    if (!adminSecret || providedSecret !== adminSecret) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }
  }

  try {
    console.log('Starting puzzle generation...');
    const result = await generatePuzzle();
    console.log('Puzzle generation complete:', result.date, result.word);

    if (isScheduledEvent) {
      return; // EventBridge doesn't use the return value
    }

    return jsonResponse(200, {
      date: result.date,
      word: result.word,
      generation_attempts: result.generation_attempts,
      used_fallback: result.used_fallback,
    });
  } catch (err) {
    console.error('Puzzle generation failed:', err);

    if (isScheduledEvent) return;
    return jsonResponse(500, { error: 'Puzzle generation failed' });
  }
};
