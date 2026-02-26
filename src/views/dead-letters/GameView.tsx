import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDeadLettersState } from '../../hooks/useDeadLettersState';
import { useTimer } from '../../hooks/useTimer';
import { Timer } from '../../components/Timer';
import { DLDraggableTile } from '../../components/DLDraggableTile';
import { DLDropSlot } from '../../components/DLDropSlot';
import type { DLTile } from '../../types';

export function GameView() {
  const navigate = useNavigate();
  const {
    state,
    moveTileToSlot,
    moveTileToTray,
    submitAnswer,
    useHint,
    resetTiles,
    updateElapsedMs,
    startGame,
    completedGame,
    secondHintAvailable,
  } = useDeadLettersState();

  const { formattedTime, elapsedMs } = useTimer({
    date: state.puzzle?.date ?? null,
    running: state.status === 'playing',
    initialElapsedMs: state.elapsedMs,
    keyPrefix: 'dl_timer_',
  });

  useEffect(() => {
    updateElapsedMs(elapsedMs);
  }, [elapsedMs, updateElapsedMs]);

  // Redirect to result if already played or complete
  useEffect(() => {
    if (state.status === 'already-played' || state.status === 'complete') {
      navigate('/dead-letters/result', {
        replace: true,
        state: { completedGame, elapsedMs },
      });
    }
  }, [state.status, navigate, completedGame, elapsedMs]);

  // Active drag tile for DragOverlay
  const [activeTile, setActiveTile] = useState<DLTile | null>(null);

  // Tap-to-place: track selected tile for mobile
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const tile = state.trayTiles.find(t => t.id === id)
      || state.slotTiles.find(t => t?.id === id);
    if (tile && !tile.isLocked) {
      setActiveTile(tile);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTile(null);
    const { active, over } = event;
    if (!over) return;

    const tileId = String(active.id);
    const overId = String(over.id);

    // Dropping on a slot
    if (overId.startsWith('slot-')) {
      const slotIndex = parseInt(overId.replace('slot-', ''), 10);
      moveTileToSlot(tileId, slotIndex);
    } else if (overId === 'tray') {
      moveTileToTray(tileId);
    }
  }

  // Tap-to-place handler for mobile
  const handleTileTap = useCallback((tileId: string) => {
    if (selectedTileId === tileId) {
      setSelectedTileId(null);
      return;
    }
    setSelectedTileId(tileId);
  }, [selectedTileId]);

  const handleSlotTap = useCallback((slotIndex: number) => {
    if (!selectedTileId) return;

    const slot = state.slotTiles[slotIndex];
    if (slot?.isLocked) return;

    moveTileToSlot(selectedTileId, slotIndex);
    setSelectedTileId(null);
  }, [selectedTileId, state.slotTiles, moveTileToSlot]);

  const handleSlotTileTap = useCallback((tileId: string) => {
    if (selectedTileId) {
      // If a tile is selected and we tap a slot tile, swap them
      const slotIndex = state.slotTiles.findIndex(t => t?.id === tileId);
      if (slotIndex >= 0) {
        moveTileToSlot(selectedTileId, slotIndex);
        setSelectedTileId(null);
      }
    } else {
      // Tap a slot tile to send it back to tray
      moveTileToTray(tileId);
    }
  }, [selectedTileId, state.slotTiles, moveTileToSlot, moveTileToTray]);

  function handleSubmit() {
    submitAnswer();
  }

  const allSlotsFilled = state.slotTiles.every(t => t !== null);
  const penaltyDisplay = state.penaltySeconds > 0 ? `+${state.penaltySeconds}s penalty` : '';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div className="view view--centered">
        <div className="loading-spinner" aria-label="Loading puzzle..." />
        <p className="loading-text">Loading today's puzzle…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div className="view view--centered">
        <div className="error-box">
          <h2>Puzzle unavailable</h2>
          <p>{state.fatalError}</p>
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Ready state (waiting for player to start) ────────────────────────────
  if (state.status === 'ready') {
    return (
      <div className="view">
        <div className="ready-card">
          <h1 className="ready-title">Dead Letters</h1>
          <p className="ready-description">
            The vowels have been removed from a hidden word and the <strong>consonants are
            scrambled</strong>. Put them back in order to reveal the word!
          </p>
          <div className="ready-rules">
            <div className="ready-rule"><strong>Drag or tap</strong> consonants into the answer slots</div>
            <div className="ready-rule">Slots are <strong>consonant positions only</strong> — vowels are hidden</div>
            <div className="ready-rule">Wrong guesses add <strong>+15s</strong>, hints add <strong>+30s</strong></div>
          </div>
          <button className="btn btn--primary btn--large" onClick={startGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="view dl-game">
        {/* Timer row */}
        <div className="game-timer-row">
          <Timer formattedTime={formattedTime} />
          {penaltyDisplay && (
            <span className="dl-penalty-badge">{penaltyDisplay}</span>
          )}
        </div>

        {/* Vowel hint */}
        <p className="dl-vowel-hint">
          The hidden word has {state.puzzle?.vowelCount} vowel{state.puzzle?.vowelCount !== 1 ? 's' : ''} (not shown below)
        </p>

        {/* Tile tray */}
        <div className="dl-tray" id="tray">
          <SortableContext
            items={state.trayTiles.map(t => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {state.trayTiles.map((tile) => (
              <DLDraggableTile
                key={tile.id}
                tile={tile}
                isSelected={selectedTileId === tile.id}
                onTap={handleTileTap}
              />
            ))}
          </SortableContext>
          {state.trayTiles.length === 0 && (
            <span className="dl-tray__empty">All tiles placed</span>
          )}
        </div>

        {/* Answer slots */}
        <div className="dl-slots">
          {state.slotTiles.map((tile, index) => (
            <DLDropSlot
              key={index}
              index={index}
              tile={tile}
              isSelected={tile ? selectedTileId === tile.id : false}
              onSlotTap={handleSlotTap}
              onTileTap={handleSlotTileTap}
            />
          ))}
        </div>

        {/* Error message */}
        {state.errorMessage && (
          <p className="dl-error-message" role="alert">
            {state.errorMessage}
            {state.incorrectSubmissions > 1 && (
              <span className="dl-penalty-note"> (+15s penalty)</span>
            )}
          </p>
        )}

        {/* Instructions */}
        {!state.errorMessage && state.trayTiles.length > 0 && (
          <p className="game-instructions">
            The vowels have been removed from a word. Put the consonants in the order they appear in the word — each slot is a consonant position, not the full word. Drag or tap to place.
          </p>
        )}

        {/* Action buttons */}
        <div className="dl-actions">
          <button
            className="btn btn--primary btn--large"
            onClick={handleSubmit}
            disabled={!allSlotsFilled}
          >
            Submit Answer
          </button>

          <div className="dl-actions__secondary">
            <button
              className="btn btn--secondary"
              onClick={useHint}
              disabled={state.hintsUsed >= 2 || (state.hintsUsed === 1 && !secondHintAvailable)}
              title={
                state.hintsUsed >= 2
                  ? 'Both hints used'
                  : state.hintsUsed === 1 && !secondHintAvailable
                    ? 'Second hint available after 1 minute'
                    : 'Reveal one consonant (+30s penalty)'
              }
            >
              {state.hintsUsed >= 2
                ? 'Both Hints Used'
                : state.hintsUsed === 1 && !secondHintAvailable
                  ? 'Second Hint at 1:00'
                  : `Reveal a Consonant (${state.hintsUsed}/2)`}
            </button>

            <button
              className="btn btn--secondary"
              onClick={resetTiles}
            >
              Reset Tiles
            </button>
          </div>

          {/* Second hint notification */}
          {secondHintAvailable && state.hintsUsed === 1 && (
            <p className="dl-hint-available" role="status">
              A second hint is now available! (+30s penalty)
            </p>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTile ? (
          <div className="dl-tile dl-tile--dragging">
            {activeTile.letter}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
