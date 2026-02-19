import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import { LetterTile } from '../components/LetterTile';
import { WordChain } from '../components/WordChain';
import { Timer } from '../components/Timer';

export function GameView() {
  const navigate = useNavigate();
  const { state, selectLetter, removeLetter, updateElapsedMs, completedGame } = useGameState();

  const { formattedTime, elapsedMs } = useTimer({
    date: state.puzzle?.date ?? null,
    running: state.status === 'playing',
    initialElapsedMs: state.elapsedMs,
  });

  // Keep game state's elapsedMs in sync so it's accurate when the game completes
  useEffect(() => {
    updateElapsedMs(elapsedMs);
  }, [elapsedMs, updateElapsedMs]);

  // Redirect to result if already played
  useEffect(() => {
    if (state.status === 'already-played' || state.status === 'complete') {
      navigate('/result', {
        replace: true,
        state: { completedGame, elapsedMs },
      });
    }
  }, [state.status, navigate, completedGame, elapsedMs]);

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

  const { currentWord, selectedLetterIndex, errorMessage, chain } = state;

  // Preview: what the word looks like with selected letter removed
  const previewWord =
    selectedLetterIndex !== null
      ? currentWord.slice(0, selectedLetterIndex) + currentWord.slice(selectedLetterIndex + 1)
      : null;

  const stepNumber = chain.length; // chain includes the starting word as step 0, so length = current step

  return (
    <div className="view">
      {/* Timer */}
      <div className="game-timer-row">
        <Timer formattedTime={formattedTime} />
        <span className="step-counter" aria-label={`Step ${stepNumber}`}>
          Step {stepNumber}
        </span>
      </div>

      {/* Current word tiles */}
      <div className="word-display" role="group" aria-label="Current word letters">
        {currentWord.split('').map((letter, i) => (
          <LetterTile
            key={i}
            letter={letter}
            index={i}
            isSelected={selectedLetterIndex === i}
            isPreviewRemoved={selectedLetterIndex === i}
            onClick={selectLetter}
          />
        ))}
      </div>

      {/* Instructions */}
      {selectedLetterIndex === null && !errorMessage && (
        <p className="game-instructions">
          Tap a letter to remove it — each step must form a valid word. Shrink down to one letter to win!
        </p>
      )}

      {/* Preview of resulting word */}
      {previewWord && (
        <div className="preview-word" aria-live="polite" aria-label={`Result: ${previewWord}`}>
          <span className="preview-label">Result:</span>
          {currentWord.split('').map((letter, i) =>
            i === selectedLetterIndex ? (
              <span key={i} className="preview-letter preview-letter--removed">
                {letter}
              </span>
            ) : (
              <span key={i} className="preview-letter">
                {letter}
              </span>
            )
          )}
        </div>
      )}

      {/* Inline error message */}
      {errorMessage && (
        <div className="error-message" role="alert" aria-live="assertive">
          {errorMessage}
        </div>
      )}

      {/* Remove letter button */}
      <button
        className="btn btn--primary btn--large"
        onClick={removeLetter}
        disabled={selectedLetterIndex === null}
        aria-disabled={selectedLetterIndex === null}
      >
        Remove Letter
      </button>

      {/* Progress chain */}
      <WordChain chain={chain} />
    </div>
  );
}
