/**
 * Seed the database with 7 days of pre-validated Dead Letters puzzle words.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-dl.ts
 *
 * Or with a .env file loaded:
 *   npx dotenv -e .env -- npx tsx scripts/seed-dl.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function extractConsonants(word: string): string {
  return word.split('').filter(ch => !VOWELS.has(ch)).join('');
}

function countVowels(word: string): number {
  return word.split('').filter(ch => VOWELS.has(ch)).length;
}

// Load dictionary to validate words
function loadDictionary(): Set<string> {
  const wordlistPath = path.join(process.cwd(), 'public', 'wordlist.txt');
  const content = fs.readFileSync(wordlistPath, 'utf-8');
  const words = new Set<string>();
  for (const line of content.split('\n')) {
    const w = line.trim().toUpperCase();
    if (w) words.add(w);
  }
  return words;
}

// Pre-validated candidate words for Dead Letters
const CANDIDATE_WORDS: Array<{ word: string; difficulty: number }> = [
  { word: 'STRENGTH', difficulty: 4 },
  { word: 'CRUMBLE', difficulty: 3 },
  { word: 'BLANKET', difficulty: 3 },
  { word: 'TRUMPET', difficulty: 3 },
  { word: 'COMPLEX', difficulty: 3 },
  { word: 'SPLINTER', difficulty: 4 },
  { word: 'GLIMPSE', difficulty: 3 },
  { word: 'COMFORT', difficulty: 2 },
  { word: 'DOLPHIN', difficulty: 3 },
  { word: 'CHAPTER', difficulty: 2 },
  { word: 'CLUSTER', difficulty: 3 },
  { word: 'FURNISH', difficulty: 3 },
  { word: 'PLASTER', difficulty: 3 },
  { word: 'TREMBLE', difficulty: 3 },
  { word: 'SCRATCH', difficulty: 4 },
  { word: 'WISDOM', difficulty: 2 },
  { word: 'KINGDOM', difficulty: 3 },
  { word: 'STUMBLE', difficulty: 3 },
  { word: 'PROBLEM', difficulty: 2 },
  { word: 'FRIENDS', difficulty: 3 },
  { word: 'CRYSTAL', difficulty: 4 },
  { word: 'PUMPKIN', difficulty: 3 },
  { word: 'MONSTER', difficulty: 2 },
  { word: 'CONTROL', difficulty: 3 },
  { word: 'TRIUMPH', difficulty: 3 },
  { word: 'PHANTOM', difficulty: 3 },
  { word: 'KITCHEN', difficulty: 2 },
  { word: 'WHISPER', difficulty: 3 },
  { word: 'DRAGON', difficulty: 3 },
  { word: 'PLASTIC', difficulty: 3 },
];

async function seed() {
  const dictionary = loadDictionary();

  console.log('Validating candidate words...');
  const validated: Array<{ word: string; consonants: string; vowelCount: number; difficulty: number }> = [];

  for (const { word, difficulty } of CANDIDATE_WORDS) {
    const upper = word.toUpperCase();
    if (!dictionary.has(upper)) {
      console.log(`  x ${upper}: not in dictionary`);
      continue;
    }
    const consonants = extractConsonants(upper);
    const vowelCount = countVowels(upper);
    if (consonants.length < 3) {
      console.log(`  x ${upper}: only ${consonants.length} consonants`);
      continue;
    }
    validated.push({ word: upper, consonants, vowelCount, difficulty });
    console.log(`  + ${upper}: ${consonants.length} consonants, ${vowelCount} vowels`);
  }

  console.log(`\nValidated ${validated.length}/${CANDIDATE_WORDS.length} words.`);

  if (validated.length < 7) {
    console.error('Not enough valid words to seed 7 days!');
    process.exit(1);
  }

  // Seed 7 days starting from today (Eastern time)
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  console.log(`\nSeeding Dead Letters puzzles starting from ${todayStr}...`);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const entry = validated[i % validated.length];

    const { error } = await supabase.from('dl_puzzles').upsert(
      {
        date: dateStr,
        word: entry.word,
        consonants: entry.consonants,
        vowel_count: entry.vowelCount,
        difficulty_score: entry.difficulty,
        difficulty_rationale: 'Seed word',
        generated_at: new Date().toISOString(),
        generation_attempts: 1,
        used_fallback: true,
      },
      { onConflict: 'date' }
    );

    if (error) {
      console.error(`  x ${dateStr} (${entry.word}): ${error.message}`);
    } else {
      console.log(`  + ${dateStr}: ${entry.word} (${entry.consonants})`);
    }
  }

  console.log('\nDead Letters seeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
