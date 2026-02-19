import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitScore, fetchLeaderboard } from '../utils/api';
import { formatTime } from '../hooks/useTimer';
import type { CompletedGame, LeaderboardEntry } from '../types';

const PLAYER_NAME_KEY = 'sw_player_name';
const MINIMUM_STEPS = 6;

export function ResultView() {
  const location = useLocation();
  const navigate = useNavigate();
  const completedGame: CompletedGame | null = location.state?.completedGame ?? null;

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
      navigate('/', { replace: true });
      return;
    }

    // Load top 5 leaderboard entries
    fetchLeaderboard(completedGame.date, 5, 0)
      .then((res) => setTopEntries(res.entries))
      .catch(console.error);
  }, [completedGame, navigate]);

  if (!completedGame) return null;

  const { date, chain, elapsedMs } = completedGame;
  const stepCount = chain.length - 1; // excludes the starting word
  const formattedTime = formatTime(elapsedMs);
  const extraSteps = stepCount - MINIMUM_STEPS;

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
      await submitScore({ playerName: trimmed, solveTimeMs: elapsedMs, stepCount, date });
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
      setSubmitted(true);

      // Refresh leaderboard after submission
      const updated = await fetchLeaderboard(date, 5, 0);
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
    const text = `The Shrinking Word — ${formatted} | Solved in ${formattedTime} | ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => {
      setShareMessage('Copied to clipboard!');
      setTimeout(() => setShareMessage(''), 2000);
    });
  }

  return (
    <div className="view view--result">
      <div className="result-card">
        <h1 className="result-title">Puzzle Complete!</h1>

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat__label">Time</span>
            <span className="result-stat__value result-stat__value--time">{formattedTime}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__label">Steps</span>
            <span className="result-stat__value">
              {stepCount}
              {extraSteps > 0 && (
                <span className="result-stat__extra"> (+{extraSteps} extra)</span>
              )}
            </span>
          </div>
        </div>

        {/* Solution chain */}
        <div className="result-chain">
          <h2 className="result-chain__title">Your Solution</h2>
          <div className="result-chain__words">
            {chain.map((word, i) => (
              <span key={i} className="result-chain__word">
                {word}
                {i < chain.length - 1 && <span className="result-chain__arrow"> → </span>}
              </span>
            ))}
          </div>
        </div>

        {/* Share button */}
        <button className="btn btn--secondary" onClick={handleShare}>
          {shareMessage || 'Share Result'}
        </button>

        {/* Score submission */}
        {!submitted ? (
          <div className="result-submit">
            <h2>Add to Leaderboard</h2>
            <form onSubmit={handleSubmit} className="name-form">
              <label htmlFor="player-name" className="name-form__label">
                Your name
              </label>
              <div className="name-form__row">
                <input
                  id="player-name"
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
                  <th>Steps</th>
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
                    <td>{entry.step_count}</td>
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
