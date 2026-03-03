/**
 * GET /get-leaderboard?date=YYYY-MM-DD&limit=25&offset=0&game_type=loseit&period=daily
 *
 * Returns ranked leaderboard entries for the specified date and game type.
 *
 * period=daily (default): existing behavior — ranked entries for a single date.
 * period=weekly: aggregated scores for authenticated users across an ISO week (Mon–Sun).
 * period=monthly: aggregated scores for authenticated users across a calendar month.
 *
 * DropIt ranking: solve_time_ms ASC, then step_count ASC, then submitted_at ASC.
 * Dead Letters ranking: solve_time_ms ASC, then submitted_at ASC.
 * Weekly/Monthly ranking: total_time_ms ASC, then days_played DESC.
 */

import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type {
  FunctionUrlEvent,
  LeaderboardEntryWithRank,
  AggregatedLeaderboardEntry,
  GameType,
  LeaderboardPeriod,
} from '../shared/types.js';

const VALID_GAME_TYPES: GameType[] = ['loseit', 'dead-letters'];
const VALID_PERIODS: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly'];

/** Get today's date string in Eastern time */
function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Calculate ISO week date range (Mon–Sun) for a given date string */
function getWeekRange(dateStr: string): { start: string; end: string; totalDays: number } {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids DST edge cases
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    totalDays: 7,
  };
}

/** Calculate calendar month date range for a given date string */
function getMonthRange(dateStr: string): { start: string; end: string; totalDays: number } {
  const [year, month] = dateStr.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, totalDays: lastDay };
}

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const params = event.queryStringParameters || {};

  const dateParam = params.date;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : todayEastern();

  const limit = Math.min(parseInt(params.limit || '25', 10) || 25, 100);
  const offset = Math.max(parseInt(params.offset || '0', 10) || 0, 0);

  const gameTypeParam = params.game_type;
  const gameType: GameType = (typeof gameTypeParam === 'string' && VALID_GAME_TYPES.includes(gameTypeParam as GameType))
    ? gameTypeParam as GameType
    : 'loseit';

  const periodParam = params.period;
  const period: LeaderboardPeriod = (typeof periodParam === 'string' && VALID_PERIODS.includes(periodParam as LeaderboardPeriod))
    ? periodParam as LeaderboardPeriod
    : 'daily';

  // ── Daily: original behavior ──────────────────────────────────────────────
  if (period === 'daily') {
    return handleDaily(date, limit, offset, gameType);
  }

  // ── Weekly / Monthly: aggregated ──────────────────────────────────────────
  return handleAggregated(period, date, limit, offset, gameType);
};

async function handleDaily(date: string, limit: number, offset: number, gameType: GameType) {
  try {
    const supabase = getSupabaseClient();

    // Get total count for this game type
    const { count } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('date', date)
      .eq('game_type', gameType);

    // Build query with game-specific ordering
    let query = supabase
      .from('leaderboard')
      .select('id, date, player_name, solve_time_ms, step_count, submitted_at, game_type, incorrect_submissions, hint_used, hints_used, user_id')
      .eq('date', date)
      .eq('game_type', gameType)
      .order('solve_time_ms', { ascending: true });

    // DropIt uses step_count as secondary sort
    if (gameType === 'loseit') {
      query = query.order('step_count', { ascending: true });
    }

    query = query
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('get-leaderboard query error:', error);
      return jsonResponse(500, { error: 'Failed to fetch leaderboard' });
    }

    // Attach rank (1-based, accounting for offset)
    const entries: LeaderboardEntryWithRank[] = (data || []).map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
    }));

    return jsonResponse(200, {
      date,
      entries,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('get-leaderboard error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}

async function handleAggregated(
  period: 'weekly' | 'monthly',
  date: string,
  limit: number,
  offset: number,
  gameType: GameType,
) {
  try {
    const supabase = getSupabaseClient();

    const range = period === 'weekly' ? getWeekRange(date) : getMonthRange(date);

    // Fetch all rows in range for authenticated users only
    const { data, error } = await supabase
      .from('leaderboard')
      .select('user_id, player_name, solve_time_ms, date')
      .eq('game_type', gameType)
      .gte('date', range.start)
      .lte('date', range.end)
      .not('user_id', 'is', null);

    if (error) {
      console.error('get-leaderboard aggregated query error:', error);
      return jsonResponse(500, { error: 'Failed to fetch leaderboard' });
    }

    // Group by user_id
    const userMap = new Map<string, {
      user_id: string;
      player_name: string;
      total_time_ms: number;
      days: Set<string>;
      best_time_ms: number;
    }>();

    for (const row of data || []) {
      if (!row.user_id) continue;
      const existing = userMap.get(row.user_id);
      if (existing) {
        existing.total_time_ms += row.solve_time_ms;
        existing.days.add(row.date);
        existing.best_time_ms = Math.min(existing.best_time_ms, row.solve_time_ms);
        // Use latest player_name (alphabetically last date entry wins)
        if (row.date > existing.player_name) {
          existing.player_name = row.player_name;
        }
      } else {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          player_name: row.player_name,
          total_time_ms: row.solve_time_ms,
          days: new Set([row.date]),
          best_time_ms: row.solve_time_ms,
        });
      }
    }

    // Sort: total_time_ms ASC, then days_played DESC (tiebreaker)
    const sorted = Array.from(userMap.values()).sort((a, b) => {
      if (a.total_time_ms !== b.total_time_ms) return a.total_time_ms - b.total_time_ms;
      return b.days.size - a.days.size;
    });

    const total = sorted.length;

    // Paginate
    const page = sorted.slice(offset, offset + limit);

    const entries: AggregatedLeaderboardEntry[] = page.map((u, i) => ({
      rank: offset + i + 1,
      user_id: u.user_id,
      player_name: u.player_name,
      total_time_ms: u.total_time_ms,
      avg_time_ms: Math.round(u.total_time_ms / u.days.size),
      days_played: u.days.size,
      total_days: range.totalDays,
      best_time_ms: u.best_time_ms,
    }));

    return jsonResponse(200, {
      period,
      startDate: range.start,
      endDate: range.end,
      totalDays: range.totalDays,
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('get-leaderboard aggregated error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
