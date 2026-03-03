/**
 * generate-puzzle Lambda handler
 *
 * Invoked by:
 *   1. AWS EventBridge Scheduler daily at 00:00 UTC (generates tomorrow's puzzle)
 *   2. HTTP POST with x-admin-secret header (manual trigger for development/testing)
 *
 * Algorithm:
 *   1. Call Claude API (claude-sonnet-4-6) requesting a 7-letter word
 *   2. Run BFS solvability validator
 *   3. If valid → store in Supabase
 *   4. If invalid → retry up to 5 times with failure context
 *   5. If all retries fail → select from fallback word list
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import { validateWord } from '../shared/validator.js';
import type { FunctionUrlEvent } from '../shared/types.js';

// Pre-validated 8-letter fallback words (used if Claude API fails all retries)
const FALLBACK_WORDS: string[] = [
  'ABRIDGED', 'ABRIDGES', 'BLASTERS', 'BLATHERS', 'BOUNCERS', 'BROWSERS',
  'BURSTING', 'CAROUSEL', 'CHANTERS', 'CHATTERS', 'CHEATERS', 'CLATTERS',
  'FLATTERS', 'GAMBLERS', 'GRANTING', 'GRUMBLES', 'HONESTLY', 'MANAGERS',
  'PLANTERS', 'PLATTERS', 'PRINCESS', 'RATTLERS', 'ROADSTER', 'SHOPPING',
  'SLANTING', 'SPLATTER', 'STARLING', 'STARTING', 'STINGERS', 'STRIKERS',
];

interface GenerationResult {
  date: string;
  word: string;
  generation_attempts: number;
  used_fallback: boolean;
  example_solution_path: string[];
}

async function generateWithClaude(
  client: Anthropic,
  previousFailures: Array<{ word: string; reason: string }> = []
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [];

  if (previousFailures.length === 0) {
    messages.push({
      role: 'user',
      content:
        'Return a single 8-letter English word only — no explanation, punctuation, or surrounding text. ' +
        'The word must be common and recognizable to a general adult audience. ' +
        'Exclude proper nouns, abbreviations, hyphenated words, and words requiring diacritical marks. ' +
        'The word should work well for a letter-removal puzzle where each step removing one letter ' +
        'creates another valid English word, ending at a 2-letter word.',
    });
  } else {
    const failureList = previousFailures
      .map((f) => `- "${f.word}": ${f.reason}`)
      .join('\n');
    messages.push({
      role: 'user',
      content:
        `The following words were rejected:\n${failureList}\n\n` +
        'Return a different single 8-letter English word only — no explanation, punctuation, or surrounding text. ' +
        'The word must be common, recognizable, and form a chain of valid English words when letters are removed one at a time, ending at a 2-letter word.',
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 20,
    temperature: 0.9,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Extract just the word (strip punctuation, whitespace, quotes)
  return text.trim().replace(/[^A-Za-z]/g, '').toUpperCase();
}

async function generatePuzzle(): Promise<GenerationResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = getSupabaseClient();

  // Target date: today in Eastern time (cron fires at 05:00 UTC = midnight ET)
  const targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const failures: Array<{ word: string; reason: string }> = [];
  let attempts = 0;

  for (let i = 0; i < 5; i++) {
    attempts++;
    let word: string;

    try {
      word = await generateWithClaude(anthropic, failures);
    } catch (err) {
      console.error(`Claude API error on attempt ${attempts}:`, err);
      failures.push({ word: '(API error)', reason: 'Claude API call failed' });
      continue;
    }

    if (!word || word.length !== 8) {
      failures.push({ word: word || '(empty)', reason: 'Response was not an 8-letter word' });
      continue;
    }

    console.log(`Attempt ${attempts}: Testing word "${word}"`);
    const validation = validateWord(word);

    if (validation.solvable && validation.path) {
      // Store in Supabase
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

    failures.push({ word, reason: validation.reason || 'No valid solution path' });
  }

  // All retries exhausted — use fallback word list
  console.warn('All Claude retries failed. Using fallback word list.', { failures });

  for (const fallbackWord of FALLBACK_WORDS) {
    const validation = validateWord(fallbackWord);
    if (!validation.solvable || !validation.path) continue;

    // Skip if used in the last 15 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from('puzzles')
      .select('date')
      .eq('word', fallbackWord)
      .gte('date', cutoffDate)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from('puzzles').upsert({
      date: targetDate,
      word: fallbackWord,
      generated_at: new Date().toISOString(),
      generation_attempts: attempts,
      used_fallback: true,
      example_solution_path: validation.path,
    });

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    // Log alert for operator
    console.error('ALERT: Fallback word list was used for puzzle generation', {
      date: targetDate,
      word: fallbackWord,
      failures,
    });

    return {
      date: targetDate,
      word: fallbackWord,
      generation_attempts: attempts,
      used_fallback: true,
      example_solution_path: validation.path,
    };
  }

  throw new Error('All fallback words exhausted. Manual intervention required.');
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
