import { useState, useEffect, useCallback } from 'react';
import { loadDictionary, isValidWord, canContinue } from '../utils/dictionary';
import { fetchPuzzle } from '../utils/api';
import type { GameState, Puzzle, CompletedGame } from '../types';

const COMPLETED_KEY_PREFIX = 'sw_completed_';

function getCompletedGame(date: string): CompletedGame | null {
  try {
    const stored = localStorage.getItem(`${COMPLETED_KEY_PREFIX}${date}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCompletedGame(game: CompletedGame) {
  localStorage.setItem(`${COMPLETED_KEY_PREFIX}${game.date}`, JSON.stringify(game));
}

function getTodayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

interface UseGameStateReturn {
  state: GameState;
  selectLetter: (index: number) => void;
  removeLetter: () => void;
  clearError: () => void;
  clearPenalty: () => void;
  markSubmitted: (playerName: string) => void;
  updateElapsedMs: (ms: number) => void;
  completedGame: CompletedGame | null;
}

export function useGameState(): UseGameStateReturn {
  const today = getTodayUtc();

  const [state, setState] = useState<GameState>({
    puzzle: null,
    chain: [],
    currentWord: '',
    selectedLetterIndex: null,
    status: 'loading',
    errorMessage: null,
    fatalError: null,
    elapsedMs: 0,
    penaltyUntil: null,
    isStuck: false,
  });

  const [completedGame, setCompletedGame] = useState<CompletedGame | null>(
    getCompletedGame(today)
  );

  // Load dictionary and puzzle on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Load dictionary and puzzle in parallel
        const [, puzzle] = await Promise.all([
          loadDictionary(),
          fetchPuzzle(today),
        ]);

        if (cancelled) return;

        // Check if already played today
        const existing = getCompletedGame(today);
        if (existing) {
          setCompletedGame(existing);
          setState((s) => ({
            ...s,
            puzzle: puzzle as Puzzle,
            status: 'already-played',
            chain: existing.chain,
            currentWord: existing.chain[existing.chain.length - 1],
            elapsedMs: existing.elapsedMs,
          }));
          return;
        }

        setState((s) => ({
          ...s,
          puzzle: puzzle as Puzzle,
          currentWord: (puzzle as Puzzle).word,
          chain: [(puzzle as Puzzle).word],
          status: 'playing',
        }));
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            status: 'error',
            fatalError:
              err instanceof Error
                ? err.message
                : 'Failed to load today\'s puzzle. Please try again.',
          }));
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [today]);

  const selectLetter = useCallback((index: number) => {
    setState((s) => {
      if (s.status !== 'playing') return s;
      // Block input during penalty
      if (s.penaltyUntil !== null && Date.now() < s.penaltyUntil) return s;
      // Toggle selection
      const newIndex = s.selectedLetterIndex === index ? null : index;
      return { ...s, selectedLetterIndex: newIndex, errorMessage: null };
    });
  }, []);

  const removeLetter = useCallback(() => {
    setState((s) => {
      if (s.status !== 'playing' || s.selectedLetterIndex === null) return s;
      // Block input during penalty
      if (s.penaltyUntil !== null && Date.now() < s.penaltyUntil) return s;

      const idx = s.selectedLetterIndex;
      const newWord = s.currentWord.slice(0, idx) + s.currentWord.slice(idx + 1);

      // Validate the resulting word — apply 2-second penalty on failure
      if (!isValidWord(newWord)) {
        return {
          ...s,
          selectedLetterIndex: null,
          errorMessage: `"${newWord}" is not a valid word`,
          penaltyUntil: Date.now() + 2000,
        };
      }

      const newChain = [...s.chain, newWord];

      // Check win condition: two-letter word
      if (newWord.length === 2) {
        const completed: CompletedGame = {
          date: s.puzzle!.date,
          chain: newChain,
          elapsedMs: s.elapsedMs,
          submitted: false,
        };
        saveCompletedGame(completed);
        setCompletedGame(completed);

        return {
          ...s,
          chain: newChain,
          currentWord: newWord,
          selectedLetterIndex: null,
          errorMessage: null,
          penaltyUntil: null,
          status: 'complete',
        };
      }

      // Check if the player is now stuck (no valid one-letter removals)
      const stuck = !canContinue(newWord);

      return {
        ...s,
        chain: newChain,
        currentWord: newWord,
        selectedLetterIndex: null,
        errorMessage: null,
        penaltyUntil: null,
        isStuck: stuck,
      };
    });
  }, []);

  const updateElapsedMs = useCallback((ms: number) => {
    setState((s) => ({ ...s, elapsedMs: ms }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, errorMessage: null }));
  }, []);

  const clearPenalty = useCallback(() => {
    setState((s) => ({ ...s, penaltyUntil: null, errorMessage: null }));
  }, []);

  const markSubmitted = useCallback((playerName: string) => {
    setState((s) => {
      if (!s.puzzle) return s;
      const updated: CompletedGame = {
        date: s.puzzle.date,
        chain: s.chain,
        elapsedMs: s.elapsedMs,
        submitted: true,
        playerName,
      };
      saveCompletedGame(updated);
      setCompletedGame(updated);
      return s;
    });
  }, []);

  return {
    state,
    selectLetter,
    removeLetter,
    clearError,
    clearPenalty,
    markSubmitted,
    updateElapsedMs,
    completedGame,
  };
}
