/**
 * Supabase client singleton for Lambda functions.
 * Uses the service-role key (full database access, server-side only).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return client;
}

/** Build a standard JSON response for Lambda function URLs. */
export function jsonResponse(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
