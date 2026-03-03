import { useState, useEffect, useRef } from 'react';
import { fetchLeaderboard, fetchAggregatedLeaderboard } from '../../utils/api';
import { formatTime } from '../../hooks/useTimer';
import type { LeaderboardEntry, AggregatedLeaderboardEntry, LeaderboardPeriod } from '../../types';

const PLAYER_NAME_KEY = 'sw_player_name';
const REFRESH_INTERVAL_MS = 60_000;

function getTodayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Get ISO week range (Mon–Sun) for a date string */
function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

/** Format a date range like "Mar 2 – Mar 8, 2026" */
function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00Z');
  const e = new Date(end + 'T12:00:00Z');
  const sMonth = s.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = e.getUTCFullYear();
  return `${sMonth} ${s.getUTCDate()} – ${eMonth} ${e.getUTCDate()}, ${year}`;
}

/** Format month label like "March 2026" */
function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Shift a date by N weeks */
function shiftWeek(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

/** Shift a date by N months */
function shiftMonth(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10);
}

export function LeaderboardView() {
  const today = getTodayEastern();

  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [date, setDate] = useState<string>(today);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [aggEntries, setAggEntries] = useState<AggregatedLeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const playerName = localStorage.getItem(PLAYER_NAME_KEY) || '';

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadDaily(selectedDate: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLeaderboard(selectedDate, 25, 0, 'loseit');
      setEntries(res.entries);
      setAggEntries([]);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadAggregated(p: 'weekly' | 'monthly', selectedDate: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAggregatedLeaderboard(p, selectedDate, 25, 0, 'loseit');
      setAggEntries(res.entries);
      setEntries([]);
      setTotal(res.total);
      setTotalDays(res.totalDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);

    if (period === 'daily') {
      loadDaily(date);
      if (date === today) {
        refreshRef.current = setInterval(() => loadDaily(date), REFRESH_INTERVAL_MS);
      }
    } else {
      loadAggregated(period, date);
    }

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [date, period]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriodChange(newPeriod: LeaderboardPeriod) {
    setPeriod(newPeriod);
    if (newPeriod === 'daily') {
      setDate(today);
    }
  }

  // Period navigation
  const weekRange = period === 'weekly' ? getWeekRange(date) : null;
  const isNextDisabled = period === 'weekly'
    ? weekRange!.end >= today
    : period === 'monthly'
      ? date.slice(0, 7) >= today.slice(0, 7)
      : false;

  return (
    <div className="view">
      <h1 className="view-title">Leaderboard</h1>

      {/* Period tabs */}
      <div className="leaderboard-tabs">
        {(['daily', 'weekly', 'monthly'] as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            className={`leaderboard-tab ${period === p ? 'leaderboard-tab--active' : ''}`}
            onClick={() => handlePeriodChange(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Daily: date picker */}
      {period === 'daily' && (
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
      )}

      {/* Weekly: prev/next navigation */}
      {period === 'weekly' && weekRange && (
        <div className="leaderboard-period-nav">
          <button
            className="leaderboard-period-nav__btn"
            onClick={() => setDate(shiftWeek(date, -1))}
            aria-label="Previous week"
          >
            &lsaquo;
          </button>
          <span className="leaderboard-period-nav__label">
            {formatWeekLabel(weekRange.start, weekRange.end)}
          </span>
          <button
            className="leaderboard-period-nav__btn"
            onClick={() => setDate(shiftWeek(date, 1))}
            disabled={isNextDisabled}
            aria-label="Next week"
          >
            &rsaquo;
          </button>
        </div>
      )}

      {/* Monthly: prev/next navigation */}
      {period === 'monthly' && (
        <div className="leaderboard-period-nav">
          <button
            className="leaderboard-period-nav__btn"
            onClick={() => setDate(shiftMonth(date, -1))}
            aria-label="Previous month"
          >
            &lsaquo;
          </button>
          <span className="leaderboard-period-nav__label">
            {formatMonthLabel(date)}
          </span>
          <button
            className="leaderboard-period-nav__btn"
            onClick={() => setDate(shiftMonth(date, 1))}
            disabled={isNextDisabled}
            aria-label="Next month"
          >
            &rsaquo;
          </button>
        </div>
      )}

      {/* Auth notice for weekly/monthly */}
      {period !== 'daily' && (
        <p className="leaderboard-auth-notice">
          Weekly and monthly rankings require a signed-in account.
        </p>
      )}

      {loading && (
        <div className="loading-spinner" aria-label="Loading leaderboard..." />
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Daily table */}
      {!loading && !error && period === 'daily' && entries.length === 0 && (
        <p className="leaderboard-empty">No scores yet for {date}. Be the first!</p>
      )}

      {!loading && period === 'daily' && entries.length > 0 && (
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

      {/* Aggregated table (weekly/monthly) */}
      {!loading && !error && period !== 'daily' && aggEntries.length === 0 && (
        <p className="leaderboard-empty">
          No scores yet for this {period === 'weekly' ? 'week' : 'month'}. Play daily and sign in to appear here!
        </p>
      )}

      {!loading && period !== 'daily' && aggEntries.length > 0 && (
        <>
          <p className="leaderboard-total">{total} player{total !== 1 ? 's' : ''}</p>
          <table className="leaderboard-table leaderboard-table--full">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Total Time</th>
                <th scope="col">Days</th>
                <th scope="col">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {aggEntries.map((entry) => (
                <tr key={entry.user_id}>
                  <td>{entry.rank}</td>
                  <td>{entry.player_name}</td>
                  <td>{formatTime(entry.total_time_ms)}</td>
                  <td>{entry.days_played}/{totalDays}</td>
                  <td>{formatTime(entry.avg_time_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
