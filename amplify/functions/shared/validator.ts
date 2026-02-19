/**
 * BFS-based solvability validator for The Shrinking Word puzzle.
 *
 * Confirms that a 7-letter candidate word has at least one valid solution path
 * by performing a breadth-first search through all possible letter removals,
 * checking each resulting string against the ENABLE dictionary.
 *
 * Completes within 5 seconds or rejects the word.
 */

import { getWordSet } from './dictionary.js';

export interface ValidationResult {
  solvable: boolean;
  path?: string[];  // One valid solution path (for logging, never sent to client)
  reason?: string;  // Why it failed (for Claude retry prompt)
}

/**
 * Generate all strings formed by removing exactly one letter from the word.
 */
function getNeighbors(word: string): string[] {
  const neighbors: string[] = [];
  for (let i = 0; i < word.length; i++) {
    neighbors.push(word.slice(0, i) + word.slice(i + 1));
  }
  return neighbors;
}

/**
 * Validate a candidate 7-letter word using BFS.
 * Returns solvable=true if at least one path exists from the word to a single letter.
 *
 * @param word - Uppercase 7-letter candidate word
 * @param timeoutMs - Abort after this many milliseconds (default: 5000)
 */
export function validateWord(word: string, timeoutMs = 5000): ValidationResult {
  const normalized = word.trim().toUpperCase();

  if (normalized.length !== 7) {
    return { solvable: false, reason: `Word "${word}" is not 7 letters long` };
  }

  const dictionary = getWordSet();

  if (!dictionary.has(normalized)) {
    return { solvable: false, reason: `Word "${word}" is not in the dictionary` };
  }

  const deadline = Date.now() + timeoutMs;

  // BFS state: each entry is [currentWord, pathSoFar]
  const queue: Array<[string, string[]]> = [[normalized, [normalized]]];
  const visited = new Set<string>([normalized]);

  while (queue.length > 0) {
    if (Date.now() > deadline) {
      return { solvable: false, reason: `Validation timed out after ${timeoutMs}ms` };
    }

    const [current, path] = queue.shift()!;

    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);

      if (!dictionary.has(neighbor)) continue;

      const newPath = [...path, neighbor];

      // A single letter is the win condition
      if (neighbor.length === 1) {
        return { solvable: true, path: newPath };
      }

      queue.push([neighbor, newPath]);
    }
  }

  return {
    solvable: false,
    reason: `No valid solution path found for "${normalized}"`,
  };
}

// Allow standalone execution for testing:
// npx tsx amplify/functions/shared/validator.ts
if (process.argv[1] && process.argv[1].includes('validator')) {
  const testWord = process.argv[2] || 'STRANGE';
  console.log(`Validating: ${testWord}`);
  const result = validateWord(testWord);
  if (result.solvable) {
    console.log('✓ Solvable');
    console.log('Path:', result.path?.join(' → '));
  } else {
    console.log('✗ Not solvable:', result.reason);
  }
}
