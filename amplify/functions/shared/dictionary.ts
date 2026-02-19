/**
 * Server-side dictionary module.
 * Parses the ENABLE word list (public domain) into a Set for O(1) lookups.
 * Loaded once at cold start and cached for the lifetime of the Lambda container.
 */

import { WORDLIST_RAW } from './wordlist-data.js';

let wordSet: Set<string> | null = null;

export function getWordSet(): Set<string> {
  if (wordSet) return wordSet;

  wordSet = new Set(
    WORDLIST_RAW.split('\n')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean)
  );

  // Ensure single letters are valid (PRD requirement)
  wordSet.add('A');
  wordSet.add('I');

  return wordSet;
}

export function isValidWord(word: string): boolean {
  return getWordSet().has(word.trim().toUpperCase());
}
