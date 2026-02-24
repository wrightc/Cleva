import { useDroppable } from '@dnd-kit/core';
import type { DLTile } from '../types';

interface DLDropSlotProps {
  index: number;
  tile: DLTile | null;
  isSelected: boolean;
  onSlotTap: (index: number) => void;
  onTileTap: (tileId: string) => void;
}

export function DLDropSlot({ index, tile, isSelected, onSlotTap, onTileTap }: DLDropSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
  });

  const className = [
    'dl-slot',
    isOver && 'dl-slot--over',
    tile && 'dl-slot--filled',
    tile?.isLocked && 'dl-slot--locked',
    isSelected && 'dl-slot--selected',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (tile && !tile.isLocked) {
      onTileTap(tile.id);
    } else if (!tile) {
      onSlotTap(index);
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={tile ? `Slot ${index + 1}: ${tile.letter}` : `Empty slot ${index + 1}`}
    >
      {tile ? (
        <span className={`dl-slot__letter ${tile.isLocked ? 'dl-slot__letter--locked' : ''}`}>
          {tile.letter}
        </span>
      ) : (
        <span className="dl-slot__placeholder">{index + 1}</span>
      )}
    </div>
  );
}
