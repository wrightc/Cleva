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
    completedGame,
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
          {state.puzzle?.vowelCount} vowel{state.puzzle?.vowelCount !== 1 ? 's' : ''} hidden
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
            Drag consonants into the slots or tap to select and place. Arrange them in the correct order to reveal the hidden word.
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
              disabled={state.hintUsed}
              title={state.hintUsed ? 'Hint already used' : 'Reveal one consonant (+30s penalty)'}
            >
              {state.hintUsed ? 'Hint Used' : 'Reveal a Consonant'}
            </button>

            <button
              className="btn btn--secondary"
              onClick={resetTiles}
            >
              Reset Tiles
            </button>
          </div>
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
