import { useState, useEffect, useCallback } from 'react';
import { fetchDLPuzzle } from '../utils/api';
import type { DLGameState, DLTile, DLCompletedGame } from '../types';

const DL_COMPLETED_KEY_PREFIX = 'dl_completed_';
const SECOND_HINT_THRESHOLD_MS = 60_000; // 60 seconds

function getCompletedGame(date: string): DLCompletedGame | null {
  try {
    const stored = localStorage.getItem(`${DL_COMPLETED_KEY_PREFIX}${date}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCompletedGame(game: DLCompletedGame) {
  localStorage.setItem(`${DL_COMPLETED_KEY_PREFIX}${game.date}`, JSON.stringify(game));
}

function getTodayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function createTiles(consonants: string): DLTile[] {
  return consonants.split('').map((letter, i) => ({
    id: `tile-${i}`,
    letter,
    isLocked: false,
  }));
}

interface UseDeadLettersStateReturn {
  state: DLGameState;
  moveTileToSlot: (tileId: string, slotIndex: number) => void;
  moveTileToTray: (tileId: string) => void;
  swapSlots: (fromIndex: number, toIndex: number) => void;
  submitAnswer: () => { correct: boolean; word?: string };
  useHint: () => void;
  resetTiles: () => void;
  updateElapsedMs: (ms: number) => void;
  completedGame: DLCompletedGame | null;
  secondHintAvailable: boolean;
}

export function useDeadLettersState(): UseDeadLettersStateReturn {
  const today = getTodayEastern();

  const [state, setState] = useState<DLGameState>({
    puzzle: null,
    trayTiles: [],
    slotTiles: [],
    status: 'loading',
    incorrectSubmissions: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    penaltySeconds: 0,
    errorMessage: null,
    fatalError: null,
  });

  const [completedGame, setCompletedGame] = useState<DLCompletedGame | null>(
    getCompletedGame(today)
  );

  // Second hint is available after 60 seconds and only 1 hint used so far
  const secondHintAvailable =
    state.status === 'playing' &&
    state.hintsUsed === 1 &&
    state.elapsedMs >= SECOND_HINT_THRESHOLD_MS;

  // Load puzzle on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const puzzle = await fetchDLPuzzle(today);

        if (cancelled) return;

        // Check if already played today
        const existing = getCompletedGame(today);
        if (existing) {
          setCompletedGame(existing);
          setState((s) => ({
            ...s,
            puzzle,
            status: 'already-played',
          }));
          return;
        }

        const tiles = createTiles(puzzle.consonants);
        const emptySlots: (DLTile | null)[] = new Array(puzzle.consonants.length).fill(null);

        setState((s) => ({
          ...s,
          puzzle,
          trayTiles: tiles,
          slotTiles: emptySlots,
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
                : "Failed to load today's Dead Letters puzzle. Please try again.",
          }));
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [today]);

  const moveTileToSlot = useCallback((tileId: string, slotIndex: number) => {
    setState((s) => {
      if (s.status !== 'playing') return s;

      // Find tile in tray or in another slot
      let tile: DLTile | null = null;
      let sourceType: 'tray' | 'slot' = 'tray';
      let sourceSlotIndex = -1;

      const trayIndex = s.trayTiles.findIndex(t => t.id === tileId);
      if (trayIndex >= 0) {
        tile = s.trayTiles[trayIndex];
        sourceType = 'tray';
      } else {
        sourceSlotIndex = s.slotTiles.findIndex(t => t?.id === tileId);
        if (sourceSlotIndex >= 0) {
          tile = s.slotTiles[sourceSlotIndex];
          sourceType = 'slot';
        }
      }

      if (!tile || tile.isLocked) return s;

      // If target slot has a locked tile, can't place there
      const targetTile = s.slotTiles[slotIndex];
      if (targetTile?.isLocked) return s;

      const newTray = [...s.trayTiles];
      const newSlots = [...s.slotTiles];

      if (sourceType === 'tray') {
        newTray.splice(trayIndex, 1);
        if (targetTile) {
          newTray.push(targetTile);
        }
      } else {
        if (targetTile) {
          newSlots[sourceSlotIndex] = targetTile;
        } else {
          newSlots[sourceSlotIndex] = null;
        }
      }

      newSlots[slotIndex] = tile;

      return { ...s, trayTiles: newTray, slotTiles: newSlots, errorMessage: null };
    });
  }, []);

  const moveTileToTray = useCallback((tileId: string) => {
    setState((s) => {
      if (s.status !== 'playing') return s;

      const slotIndex = s.slotTiles.findIndex(t => t?.id === tileId);
      if (slotIndex < 0) return s;

      const tile = s.slotTiles[slotIndex];
      if (!tile || tile.isLocked) return s;

      const newTray = [...s.trayTiles, tile];
      const newSlots = [...s.slotTiles];
      newSlots[slotIndex] = null;

      return { ...s, trayTiles: newTray, slotTiles: newSlots, errorMessage: null };
    });
  }, []);

  const swapSlots = useCallback((fromIndex: number, toIndex: number) => {
    setState((s) => {
      if (s.status !== 'playing') return s;
      if (fromIndex === toIndex) return s;

      const fromTile = s.slotTiles[fromIndex];
      const toTile = s.slotTiles[toIndex];

      if (fromTile?.isLocked || toTile?.isLocked) return s;

      const newSlots = [...s.slotTiles];
      newSlots[fromIndex] = toTile;
      newSlots[toIndex] = fromTile;

      return { ...s, slotTiles: newSlots, errorMessage: null };
    });
  }, []);

  const submitAnswer = useCallback((): { correct: boolean; word?: string } => {
    const s = state;
    if (s.status !== 'playing' || !s.puzzle) return { correct: false };

    const allFilled = s.slotTiles.every(t => t !== null);
    if (!allFilled) return { correct: false };

    const playerConsonants = s.slotTiles.map(t => t!.letter).join('');

    // Check against the correct consonant order from the puzzle
    if (playerConsonants === s.puzzle.correctConsonants) {
      const completed: DLCompletedGame = {
        date: s.puzzle.date,
        word: s.puzzle.word,
        consonants: s.puzzle.consonants,
        elapsedMs: s.elapsedMs,
        penaltySeconds: s.penaltySeconds,
        incorrectSubmissions: s.incorrectSubmissions,
        hintsUsed: s.hintsUsed,
        submitted: false,
      };
      saveCompletedGame(completed);
      setCompletedGame(completed);

      setState((prev) => ({ ...prev, status: 'complete' }));
      return { correct: true };
    }

    // Incorrect submission
    setState((prev) => {
      const newIncorrect = prev.incorrectSubmissions + 1;
      const additionalPenalty = newIncorrect > 1 ? 15 : 0;
      return {
        ...prev,
        incorrectSubmissions: newIncorrect,
        penaltySeconds: prev.penaltySeconds + additionalPenalty,
        errorMessage: 'Not quite — try again!',
      };
    });

    return { correct: false };
  }, [state]);

  const useHint = useCallback(() => {
    setState((s) => {
      if (s.status !== 'playing' || !s.puzzle) return s;

      // Max 2 hints; second hint requires 60s elapsed
      if (s.hintsUsed >= 2) return s;
      if (s.hintsUsed === 1 && s.elapsedMs < SECOND_HINT_THRESHOLD_MS) return s;

      const correctOrder = s.puzzle.correctConsonants;

      // Find positions that don't have the correct letter locked
      const newSlots = [...s.slotTiles];
      const newTray = [...s.trayTiles];

      const candidates: number[] = [];
      for (let i = 0; i < correctOrder.length; i++) {
        const slot = newSlots[i];
        if (!slot || !slot.isLocked) {
          candidates.push(i);
        }
      }

      if (candidates.length === 0) return s;

      // Pick a random candidate position
      const targetIdx = candidates[Math.floor(Math.random() * candidates.length)];
      const correctLetter = correctOrder[targetIdx];

      // Find a tile with this letter from tray or wrong slot
      let hintTile: DLTile | null = null;

      // Check tray first
      const trayIdx = newTray.findIndex(t => t.letter === correctLetter && !t.isLocked);
      if (trayIdx >= 0) {
        hintTile = { ...newTray[trayIdx], isLocked: true };
        newTray.splice(trayIdx, 1);

        // If there's already a tile in the target slot, move it to tray
        if (newSlots[targetIdx] && !newSlots[targetIdx]!.isLocked) {
          newTray.push(newSlots[targetIdx]!);
        }
      } else {
        // Find in slots (wrong position)
        for (let i = 0; i < newSlots.length; i++) {
          const slot = newSlots[i];
          if (slot && !slot.isLocked && slot.letter === correctLetter && i !== targetIdx) {
            hintTile = { ...slot, isLocked: true };
            // Move whatever was in the target slot back
            if (newSlots[targetIdx] && !newSlots[targetIdx]!.isLocked) {
              newSlots[i] = newSlots[targetIdx];
            } else {
              newSlots[i] = null;
            }
            break;
          }
        }
      }

      if (!hintTile) return s;

      newSlots[targetIdx] = hintTile;

      return {
        ...s,
        trayTiles: newTray,
        slotTiles: newSlots,
        hintsUsed: s.hintsUsed + 1,
        penaltySeconds: s.penaltySeconds + 30,
        errorMessage: null,
      };
    });
  }, []);

  const resetTiles = useCallback(() => {
    setState((s) => {
      if (s.status !== 'playing' || !s.puzzle) return s;

      const lockedSlots: (DLTile | null)[] = new Array(s.puzzle.consonants.length).fill(null);
      const trayTiles: DLTile[] = [];

      for (let i = 0; i < s.slotTiles.length; i++) {
        const tile = s.slotTiles[i];
        if (tile?.isLocked) {
          lockedSlots[i] = tile;
        } else if (tile) {
          trayTiles.push(tile);
        }
      }

      trayTiles.push(...s.trayTiles);

      return { ...s, trayTiles, slotTiles: lockedSlots, errorMessage: null };
    });
  }, []);

  const updateElapsedMs = useCallback((ms: number) => {
    setState((s) => ({ ...s, elapsedMs: ms }));
  }, []);

  return {
    state,
    moveTileToSlot,
    moveTileToTray,
    swapSlots,
    submitAnswer,
    useHint,
    resetTiles,
    updateElapsedMs,
    completedGame,
    secondHintAvailable,
  };
}
