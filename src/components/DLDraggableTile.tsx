import { useDraggable } from '@dnd-kit/core';
import type { DLTile } from '../types';

interface DLDraggableTileProps {
  tile: DLTile;
  isSelected: boolean;
  onTap: (tileId: string) => void;
}

export function DLDraggableTile({ tile, isSelected, onTap }: DLDraggableTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tile.id,
    disabled: tile.isLocked,
  });

  const className = [
    'dl-tile',
    tile.isLocked && 'dl-tile--locked',
    isDragging && 'dl-tile--dragging',
    isSelected && 'dl-tile--selected',
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={setNodeRef}
      className={className}
      onClick={() => onTap(tile.id)}
      disabled={tile.isLocked}
      {...listeners}
      {...attributes}
    >
      {tile.letter}
    </button>
  );
}
