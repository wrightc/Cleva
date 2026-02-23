/**
 * Replace today's puzzle word with a new one.
 * Usage: npx dotenv -e .env -- npx tsx scripts/replace-today.ts
 */

import { createClient } from '@supabase/supabase-js';
import { validateWord } from '../amplify/functions/shared/validator.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CANDIDATES = [
  'BURSTING', 'BOUNCERS', 'BROWSERS', 'CAROUSEL', 'CHANTERS',
  'CHATTERS', 'CHEATERS', 'CLATTERS', 'FLATTERS', 'GAMBLERS',
  'GRANTING', 'GRUMBLES', 'HONESTLY', 'MANAGERS', 'PLANTERS',
  'PLATTERS', 'PRINCESS', 'RATTLERS', 'ROADSTER', 'SHOPPING',
  'SLANTING', 'SPLATTER', 'STARLING', 'STARTING', 'STINGERS',
  'STRIKERS', 'SWEATING', 'THEATERS', 'THROWING', 'WRAPPING', 'WRINKLED',
];

async function main() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch recent words to avoid repeats
  const { data: recent } = await supabase
    .from('puzzles')
    .select('word')
    .order('date', { ascending: false })
    .limit(7);

  const recentWords = new Set((recent ?? []).map((r: { word: string }) => r.word));
  console.log('Recent words to avoid:', [...recentWords]);

  // Pick first candidate not used recently
  for (const word of CANDIDATES) {
    if (recentWords.has(word)) {
      console.log(`Skipping ${word} (used recently)`);
      continue;
    }

    const validation = validateWord(word);
    if (!validation.solvable || !validation.path) {
      console.log(`Skipping ${word} (not solvable)`);
      continue;
    }

    console.log(`Replacing today's puzzle with: ${word}`);
    console.log(`Solution path: ${validation.path.join(' → ')}`);

    const { error } = await supabase.from('puzzles').upsert(
      {
        date: today,
        word,
        generated_at: new Date().toISOString(),
        generation_attempts: 1,
        used_fallback: true,
        example_solution_path: validation.path,
      },
      { onConflict: 'date' }
    );

    if (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }

    console.log(`✓ Done — today (${today}) is now: ${word}`);
    return;
  }

  console.error('No suitable replacement found!');
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
