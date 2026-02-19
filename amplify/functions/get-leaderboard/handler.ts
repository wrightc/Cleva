/**
 * GET /get-leaderboard?date=YYYY-MM-DD&limit=25&offset=0
 *
 * Returns ranked leaderboard entries for the specified date.
 * Ranking: solve_time_ms ASC, then step_count ASC, then submitted_at ASC.
 */

import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent, LeaderboardEntryWithRank } from '../shared/types.js';

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const params = event.queryStringParameters || {};

  const dateParam = params.date;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().split('T')[0];

  const limit = Math.min(parseInt(params.limit || '25', 10) || 25, 100);
  const offset = Math.max(parseInt(params.offset || '0', 10) || 0, 0);

  try {
    const supabase = getSupabaseClient();

    // Get total count
    const { count } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('date', date);

    // Get paginated entries, ordered by ranking criteria
    const { data, error } = await supabase
      .from('leaderboard')
      .select('id, date, player_name, solve_time_ms, step_count, submitted_at')
      .eq('date', date)
      .order('solve_time_ms', { ascending: true })
      .order('step_count', { ascending: true })
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);

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
};
