import { useState, useEffect, useRef } from 'react';
import { fetchLeaderboard } from '../../utils/api';
import { formatTime } from '../../hooks/useTimer';
import type { LeaderboardEntry } from '../../types';

const PLAYER_NAME_KEY = 'sw_player_name';
const REFRESH_INTERVAL_MS = 60_000;

function getTodayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

export function LeaderboardView() {
  const today = getTodayUtc();

  const [date, setDate] = useState<string>(today);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const playerName = localStorage.getItem(PLAYER_NAME_KEY) || '';

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(selectedDate: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLeaderboard(selectedDate, 25, 0, 'loseit');
      setEntries(res.entries);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(date);

    // Auto-refresh every 60 seconds while viewing today's leaderboard
    if (date === today) {
      refreshRef.current = setInterval(() => load(date), REFRESH_INTERVAL_MS);
    }

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="view">
      <h1 className="view-title">Leaderboard</h1>

      <div className="leaderboard-controls">
        <label htmlFor="date-picker" className="leaderboard-controls__label">
          Date:
        </label>
        <input
          id="date-picker"
          type="date"
          className="leaderboard-controls__date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading && (
        <div className="loading-spinner" aria-label="Loading leaderboard…" />
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="leaderboard-empty">No scores yet for {date}. Be the first!</p>
      )}

      {!loading && entries.length > 0 && (
        <>
          <p className="leaderboard-total">{total} player{total !== 1 ? 's' : ''} completed today's puzzle</p>
          <table className="leaderboard-table leaderboard-table--full">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Time</th>
                <th scope="col">Steps</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={
                    entry.player_name === playerName
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
        </>
      )}
    </div>
  );
}
