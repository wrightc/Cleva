/**
 * GET /get-leaderboard?date=YYYY-MM-DD&limit=25&offset=0&game_type=loseit
 *
 * Returns ranked leaderboard entries for the specified date and game type.
 * LoseIt ranking: solve_time_ms ASC, then step_count ASC, then submitted_at ASC.
 * Dead Letters ranking: solve_time_ms ASC, then submitted_at ASC.
 */

import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent, LeaderboardEntryWithRank, GameType } from '../shared/types.js';

const VALID_GAME_TYPES: GameType[] = ['loseit', 'dead-letters'];

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const params = event.queryStringParameters || {};

  const dateParam = params.date;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const limit = Math.min(parseInt(params.limit || '25', 10) || 25, 100);
  const offset = Math.max(parseInt(params.offset || '0', 10) || 0, 0);

  const gameTypeParam = params.game_type;
  const gameType: GameType = (typeof gameTypeParam === 'string' && VALID_GAME_TYPES.includes(gameTypeParam as GameType))
    ? gameTypeParam as GameType
    : 'loseit';

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
      .select('id, date, player_name, solve_time_ms, step_count, submitted_at, game_type, incorrect_submissions, hint_used')
      .eq('date', date)
      .eq('game_type', gameType)
      .order('solve_time_ms', { ascending: true });

    // LoseIt uses step_count as secondary sort
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
};
