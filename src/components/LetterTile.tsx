interface LetterTileProps {
  letter: string;
  index: number;
  isSelected: boolean;
  isPreviewRemoved: boolean;
  onClick: (index: number) => void;
}

export function LetterTile({ letter, index, isSelected, isPreviewRemoved, onClick }: LetterTileProps) {
  return (
    <button
      className={[
        'letter-tile',
        isSelected ? 'letter-tile--selected' : '',
        isPreviewRemoved ? 'letter-tile--preview-removed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onClick(index)}
      aria-label={`Letter ${letter}, position ${index + 1}`}
      aria-pressed={isSelected}
    >
      {letter}
    </button>
  );
}
