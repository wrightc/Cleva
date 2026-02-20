/**
 * Client-side dictionary module.
 * Fetches the ENABLE word list (public domain, /wordlist.txt) at app startup
 * and parses it into a Set<string> for O(1) word validation.
 *
 * Dictionary: ENABLE (Enhanced North American Benchmark LExicon), public domain.
 * Source: https://github.com/dolph/dictionary
 */

let wordSet: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
  if (wordSet) return wordSet;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/wordlist.txt')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load dictionary: ${res.status}`);
      return res.text();
    })
    .then((text) => {
      const set = new Set(
        text
          .split('\n')
          .map((w) => w.trim().toUpperCase())
          .filter(Boolean)
      );
      // Ensure single letters are valid (PRD requirement)
      set.add('A');
      set.add('I');
      wordSet = set;
      return set;
    });

  return loadPromise;
}

export function isValidWord(word: string): boolean {
  if (!wordSet) throw new Error('Dictionary not loaded yet. Call loadDictionary() first.');
  return wordSet.has(word.trim().toUpperCase());
}

export function getDictionary(): Set<string> | null {
  return wordSet;
}

/** Returns true if at least one valid word can be formed by removing one letter. */
export function canContinue(word: string): boolean {
  if (!wordSet) throw new Error('Dictionary not loaded yet.');
  for (let i = 0; i < word.length; i++) {
    const candidate = word.slice(0, i) + word.slice(i + 1);
    if (wordSet.has(candidate.toUpperCase())) return true;
  }
  return false;
}
