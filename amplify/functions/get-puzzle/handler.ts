/**
 * GET /get-puzzle?date=YYYY-MM-DD
 *
 * Returns the puzzle for the specified date (defaults to today UTC).
 * Never exposes example_solution_path to the client.
 */

import { getSupabaseClient, jsonResponse } from '../shared/supabase.js';
import type { FunctionUrlEvent } from '../shared/types.js';

export const handler = async (event: FunctionUrlEvent) => {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  const dateParam = event.queryStringParameters?.date;

  // Default to today's UTC date
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().split('T')[0];

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('puzzles')
      .select('date, word')   // Never select example_solution_path
      .eq('date', date)
      .single();

    if (error || !data) {
      return jsonResponse(404, { error: `No puzzle found for ${date}` });
    }

    return jsonResponse(200, { date: data.date, word: data.word });
  } catch (err) {
    console.error('get-puzzle error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
};
