import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitScore, fetchLeaderboard } from '../../utils/api';
import { formatTime } from '../../hooks/useTimer';
import type { DLCompletedGame, LeaderboardEntry } from '../../types';

const PLAYER_NAME_KEY = 'sw_player_name';

function formatPenalty(seconds: number): string {
  if (seconds === 0) return 'None';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function ResultView() {
  const location = useLocation();
  const navigate = useNavigate();
  const completedGame: DLCompletedGame | null = location.state?.completedGame ?? null;

  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem(PLAYER_NAME_KEY) || ''
  );
  const [nameError, setNameError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(completedGame?.submitted ?? false);
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([]);
  const [shareMessage, setShareMessage] = useState<string>('');

  useEffect(() => {
    if (!completedGame) {
      navigate('/dead-letters', { replace: true });
      return;
    }

    fetchLeaderboard(completedGame.date, 5, 0, 'dead-letters')
      .then((res) => setTopEntries(res.entries))
      .catch(console.error);
  }, [completedGame, navigate]);

  if (!completedGame) return null;

  const { date, word, elapsedMs, penaltySeconds, incorrectSubmissions, hintsUsed } = completedGame;
  const rawTime = formatTime(elapsedMs);
  const totalMs = elapsedMs + (penaltySeconds * 1000);
  const finalTime = formatTime(totalMs);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = playerName.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setNameError('Name must be 2–20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setNameError('Only letters, numbers, and spaces allowed');
      return;
    }

    setNameError('');
    setIsSubmitting(true);

    try {
      await submitScore({
        playerName: trimmed,
        solveTimeMs: totalMs,
        stepCount: 1,
        date,
        gameType: 'dead-letters',
        incorrectSubmissions,
        hintUsed: hintsUsed > 0,
      });
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
      setSubmitted(true);

      const updated = await fetchLeaderboard(date, 5, 0, 'dead-letters');
      setTopEntries(updated.entries);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleShare() {
    const [year, month, day] = date.split('-');
    const formatted = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
      'en-US', { month: 'long', day: 'numeric' }
    );
    const text = `Dead Letters — ${formatted} | Solved in ${finalTime} | ${window.location.origin}/dead-letters`;
    navigator.clipboard.writeText(text).then(() => {
      setShareMessage('Copied to clipboard!');
      setTimeout(() => setShareMessage(''), 2000);
    });
  }

  // Render word with vowels highlighted
  const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

  return (
    <div className="view view--result">
      <div className="result-card">
        <h1 className="result-title">Puzzle Complete!</h1>

        {/* Revealed word with vowels highlighted */}
        {word && (
          <div className="dl-result-word">
            {word.split('').map((letter, i) => (
              <span
                key={i}
                className={`dl-result-letter ${VOWELS.has(letter) ? 'dl-result-letter--vowel' : ''}`}
              >
                {letter}
              </span>
            ))}
          </div>
        )}

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat__label">Raw Time</span>
            <span className="result-stat__value">{rawTime}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__label">Penalties</span>
            <span className="result-stat__value">{formatPenalty(penaltySeconds)}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__label">Final Time</span>
            <span className="result-stat__value result-stat__value--time">{finalTime}</span>
          </div>
        </div>

        {/* Penalty breakdown */}
        {penaltySeconds > 0 && (
          <div className="dl-penalty-breakdown">
            {incorrectSubmissions > 1 && (
              <p>{incorrectSubmissions - 1} extra wrong guess{incorrectSubmissions > 2 ? 'es' : ''}: +{(incorrectSubmissions - 1) * 15}s</p>
            )}
            {hintsUsed > 0 && <p>{hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used: +{hintsUsed * 30}s</p>}
          </div>
        )}

        {/* Share button */}
        <button className="btn btn--secondary" onClick={handleShare}>
          {shareMessage || 'Share Result'}
        </button>

        <p className="result-comeback">
          Come back tomorrow for a new puzzle! A new word is available every day at{' '}
          <strong>midnight Eastern time</strong>.
        </p>

        {/* Score submission */}
        {!submitted ? (
          <div className="result-submit">
            <h2>Add to Leaderboard</h2>
            <form onSubmit={handleSubmit} className="name-form">
              <label htmlFor="dl-player-name" className="name-form__label">
                Your name
              </label>
              <div className="name-form__row">
                <input
                  id="dl-player-name"
                  type="text"
                  className="name-form__input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  placeholder="Enter your name"
                  autoComplete="nickname"
                />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
              {nameError && <p className="name-form__error">{nameError}</p>}
            </form>
          </div>
        ) : (
          <p className="result-submitted">Score submitted! Check the leaderboard.</p>
        )}

        {/* Leaderboard preview */}
        {topEntries.length > 0 && (
          <div className="leaderboard-preview">
            <h2>Today's Top 5</h2>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th title="Hint used">💡</th>
                </tr>
              </thead>
              <tbody>
                {topEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      entry.player_name === playerName && submitted
                        ? 'leaderboard-table__row--highlight'
                        : ''
                    }
                  >
                    <td>{entry.rank}</td>
                    <td>{entry.player_name}</td>
                    <td>{formatTime(entry.solve_time_ms)}</td>
                    <td>{entry.hint_used ? '💡' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
