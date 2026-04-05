/**
 * Seed the database with 7 days of pre-validated puzzle words.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
 *
 * Or with a .env file loaded:
 *   npx dotenv -e .env -- npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { validateWord } from '../amplify/functions/shared/validator.js';
import { SOLVABLE_8_LETTER_WORDS } from '../amplify/functions/shared/solvable-words.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CANDIDATE_WORDS = SOLVABLE_8_LETTER_WORDS;

async function seed() {
  console.log('Validating candidate words...');

  const validated: Array<{ word: string; path: string[] }> = [];

  for (const word of CANDIDATE_WORDS) {
    const result = validateWord(word);
    if (result.solvable && result.path) {
      validated.push({ word, path: result.path });
      console.log(`  ✓ ${word}: ${result.path.join(' → ')}`);
    } else {
      console.log(`  ✗ ${word}: ${result.reason}`);
    }
  }

  console.log(`\nValidated ${validated.length}/${CANDIDATE_WORDS.length} words.`);

  if (validated.length < 7) {
    console.error('Not enough valid words to seed 7 days!');
    process.exit(1);
  }

  // Seed 7 days starting from today (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log('\nSeeding puzzles...');

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const { word, path } = validated[i % validated.length];

    const { error } = await supabase.from('puzzles').upsert(
      {
        date: dateStr,
        word,
        generated_at: new Date().toISOString(),
        generation_attempts: 1,
        used_fallback: true,
        example_solution_path: path,
      },
      { onConflict: 'date' }
    );

    if (error) {
      console.error(`  ✗ ${dateStr} (${word}): ${error.message}`);
    } else {
      console.log(`  ✓ ${dateStr}: ${word}`);
    }
  }

  console.log('\nSeeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
