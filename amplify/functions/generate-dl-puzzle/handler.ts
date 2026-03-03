/**
 * generate-dl-puzzle Lambda handler
 *
 * Invoked by:
 *   1. AWS EventBridge Scheduler daily at 05:00 UTC (midnight ET)
 *   2. HTTP POST with x-admin-secret header (manual trigger)
 *
 * Algorithm:
 *   1. Call Claude API (claude-sonnet-4-6) requesting a word with difficulty
 *   2. Validate: in dictionary, ≥3 consonants, 4-12 letters
 *   3. If valid → store in Supabase dl_puzzles
 *   4. If invalid → retry up to 5 times with failure context
 *   5. If all retries fail → select from fallback word list
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import { getWordSet } from '../shared/dictionary.js';
import type { FunctionUrlEvent } from '../shared/types.js';

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function extractConsonants(word: string): string {
  return word.split('').filter(ch => !VOWELS.has(ch)).join('');
}

function countVowels(word: string): number {
  return word.split('').filter(ch => VOWELS.has(ch)).length;
}

// Pre-validated fallback words (≥3 consonants after vowel removal, 4-12 letters)
const FALLBACK_WORDS: Array<{ word: string; difficulty: number }> = [
  { word: 'STRENGTH', difficulty: 4 },
  { word: 'CRUMBLE', difficulty: 3 },
  { word: 'BLANKETS', difficulty: 3 },
  { word: 'TRUMPET', difficulty: 3 },
  { word: 'SQUIRM', difficulty: 4 },
  { word: 'PILGRIM', difficulty: 4 },
  { word: 'RHYTHM', difficulty: 5 },
  { word: 'COMPLEX', difficulty: 3 },
  { word: 'SPLINTER', difficulty: 4 },
  { word: 'GLIMPSE', difficulty: 3 },
  { word: 'COMFORT', difficulty: 2 },
  { word: 'DOLPHIN', difficulty: 3 },
  { word: 'BLOSSOM', difficulty: 2 },
  { word: 'CHAPTER', difficulty: 2 },
  { word: 'CLUSTER', difficulty: 3 },
  { word: 'FURNISH', difficulty: 3 },
  { word: 'PLASTER', difficulty: 3 },
  { word: 'TREMBLE', difficulty: 3 },
  { word: 'SCRATCH', difficulty: 4 },
  { word: 'CRISP', difficulty: 4 },
  { word: 'WISDOM', difficulty: 2 },
  { word: 'KINGDOM', difficulty: 3 },
  { word: 'STUMBLE', difficulty: 3 },
  { word: 'PROBLEM', difficulty: 2 },
  { word: 'FRIENDS', difficulty: 3 },
  { word: 'CRYSTAL', difficulty: 4 },
  { word: 'PUMPKIN', difficulty: 3 },
  { word: 'MONSTER', difficulty: 2 },
  { word: 'CONTROL', difficulty: 3 },
  { word: 'GLYPH', difficulty: 5 },
  { word: 'TRIUMPH', difficulty: 3 },
  { word: 'PHANTOM', difficulty: 3 },
  { word: 'KITCHEN', difficulty: 2 },
  { word: 'CAPTAIN', difficulty: 2 },
  { word: 'WHISPER', difficulty: 3 },
  { word: 'DRAGON', difficulty: 3 },
  { word: 'PLASTIC', difficulty: 3 },
  { word: 'BLANKET', difficulty: 3 },
  { word: 'WHISTLE', difficulty: 3 },
  { word: 'SHELTER', difficulty: 2 },
  { word: 'WESTERN', difficulty: 2 },
  { word: 'STRANGE', difficulty: 3 },
  { word: 'LOBSTER', difficulty: 3 },
];

interface ClaudeResponse {
  word: string;
  difficulty: number;
  rationale: string;
}

async function generateWithClaude(
  client: Anthropic,
  previousFailures: Array<{ word: string; reason: string }> = []
): Promise<ClaudeResponse> {
  let prompt: string;

  if (previousFailures.length === 0) {
    prompt =
      'You are generating a word for a daily puzzle game called "Dead Letters". ' +
      'In this game, all vowels (A, E, I, O, U) are removed from a word, leaving only consonants. ' +
      'Players must arrange the scrambled consonants in the correct order.\n\n' +
      'Return a JSON object with exactly these fields:\n' +
      '- "word": a single common English word (4-12 letters), recognizable to a general adult audience\n' +
      '- "difficulty": an integer 1-5 rating the puzzle difficulty\n' +
      '- "rationale": a brief explanation of the difficulty rating\n\n' +
      'Requirements:\n' +
      '- The word must have at least 3 consonants remaining after removing all vowels\n' +
      '- Exclude proper nouns, abbreviations, hyphenated words, and words with diacritical marks\n' +
      '- Y is treated as a consonant\n' +
      '- Difficulty factors: word length, consonant cluster density, word familiarity, duplicate consonants\n\n' +
      'Return ONLY the JSON object, no other text.';
  } else {
    const failureList = previousFailures
      .map((f) => `- "${f.word}": ${f.reason}`)
      .join('\n');
    prompt =
      `The following words were rejected for the Dead Letters puzzle:\n${failureList}\n\n` +
      'Return a different word as a JSON object with fields: "word", "difficulty" (1-5), "rationale".\n' +
      'Requirements: 4-12 letters, common English, ≥3 consonants after removing vowels (A,E,I,O,U), ' +
      'no proper nouns. Return ONLY the JSON object.';
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    word: String(parsed.word || '').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    difficulty: Math.min(5, Math.max(1, Math.round(Number(parsed.difficulty) || 3))),
    rationale: String(parsed.rationale || ''),
  };
}

function validateWord(word: string, wordSet: Set<string>): { valid: boolean; reason?: string } {
  if (!word || word.length < 4 || word.length > 12) {
    return { valid: false, reason: `Word "${word}" must be 4-12 letters (got ${word?.length || 0})` };
  }
  if (!wordSet.has(word.toUpperCase())) {
    return { valid: false, reason: `Word "${word}" not found in dictionary` };
  }
  const consonants = extractConsonants(word);
  if (consonants.length < 3) {
    return { valid: false, reason: `Word "${word}" has only ${consonants.length} consonants (need ≥3)` };
  }
  return { valid: true };
}

async function generatePuzzle() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = getSupabaseClient();
  const wordSet = getWordSet();

  // Target date: today in Eastern time
  const targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const failures: Array<{ word: string; reason: string }> = [];
  let attempts = 0;

  for (let i = 0; i < 5; i++) {
    attempts++;
    let result: ClaudeResponse;

    try {
      result = await generateWithClaude(anthropic, failures);
    } catch (err) {
      console.error(`Claude API error on attempt ${attempts}:`, err);
      failures.push({ word: '(API error)', reason: 'Claude API call failed' });
      continue;
    }

    console.log(`Attempt ${attempts}: Testing word "${result.word}"`);
    const validation = validateWord(result.word, wordSet);

    if (validation.valid) {
      const consonants = extractConsonants(result.word);
      const vowelCount = countVowels(result.word);

      const { error } = await supabase.from('dl_puzzles').upsert({
        date: targetDate,
        word: result.word,
        consonants,
        vowel_count: vowelCount,
        difficulty_score: result.difficulty,
        difficulty_rationale: result.rationale,
        generated_at: new Date().toISOString(),
        generation_attempts: attempts,
        used_fallback: false,
      });

      if (error) throw new Error(`Supabase insert error: ${error.message}`);

      return {
        date: targetDate,
        word: result.word,
        consonants,
        vowel_count: vowelCount,
        difficulty_score: result.difficulty,
        generation_attempts: attempts,
        used_fallback: false,
      };
    }

    failures.push({ word: result.word, reason: validation.reason! });
  }

  // All retries exhausted — use fallback
  console.warn('All Claude retries failed. Using fallback word list.', { failures });

  for (const fallback of FALLBACK_WORDS) {
    const validation = validateWord(fallback.word, wordSet);
    if (!validation.valid) continue;

    // Skip if used in the last 15 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from('dl_puzzles')
      .select('date')
      .eq('word', fallback.word)
      .gte('date', cutoffDate)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const consonants = extractConsonants(fallback.word);
    const vowelCount = countVowels(fallback.word);

    const { error } = await supabase.from('dl_puzzles').upsert({
      date: targetDate,
      word: fallback.word,
      consonants,
      vowel_count: vowelCount,
      difficulty_score: fallback.difficulty,
      difficulty_rationale: 'Fallback word',
      generated_at: new Date().toISOString(),
      generation_attempts: attempts,
      used_fallback: true,
    });

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    console.error('ALERT: Fallback word used for Dead Letters puzzle generation', {
      date: targetDate,
      word: fallback.word,
      failures,
    });

    return {
      date: targetDate,
      word: fallback.word,
      consonants,
      vowel_count: vowelCount,
      difficulty_score: fallback.difficulty,
      generation_attempts: attempts,
      used_fallback: true,
    };
  }

  throw new Error('All fallback words exhausted. Manual intervention required.');
}

export const handler = async (event: FunctionUrlEvent | Record<string, unknown>) => {
  const isScheduledEvent = !('requestContext' in event) ||
    !((event as FunctionUrlEvent).requestContext?.http);

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
    console.log('Starting Dead Letters puzzle generation...');
    const result = await generatePuzzle();
    console.log('Dead Letters puzzle generation complete:', result.date, result.word);

    if (isScheduledEvent) return;

    return jsonResponse(200, {
      date: result.date,
      word: result.word,
      consonants: result.consonants,
      vowel_count: result.vowel_count,
      difficulty_score: result.difficulty_score,
      generation_attempts: result.generation_attempts,
      used_fallback: result.used_fallback,
    });
  } catch (err) {
    console.error('Dead Letters puzzle generation failed:', err);
    if (isScheduledEvent) return;
    return jsonResponse(500, { error: 'Puzzle generation failed' });
  }
};
