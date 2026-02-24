/**
 * Health-Check Lambda — runs at 05:15 UTC daily (15 min after puzzle generation).
 *
 * Checks:
 * 1. LoseIt puzzle exists for today
 * 2. LoseIt puzzle is solvable (BFS validation)
 * 3. Dead Letters puzzle exists for today
 * 4. Dead Letters puzzle is valid (consonants length, dictionary check)
 * 5. Fallback detection on both puzzles (warning)
 *
 * Publishes failures to SNS so the operator gets an email alert.
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getSupabaseClient } from '../shared/supabase.js';
import { validateWord } from '../shared/validator.js';
import { isValidWord } from '../shared/dictionary.js';

const sns = new SNSClient({});

function getTodayEastern(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = eastern.getFullYear();
  const month = String(eastern.getMonth() + 1).padStart(2, '0');
  const day = String(eastern.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import type { Context } from 'aws-lambda';

const TOPIC_NAME = 'puzzle-alerts';

export async function handler(_event: unknown, context: Context): Promise<void> {
  const today = getTodayEastern();
  // Construct SNS topic ARN at runtime to avoid cross-stack circular dependency
  const accountId = context.invokedFunctionArn.split(':')[4];
  const region = process.env.AWS_REGION!;
  const topicArn = `arn:aws:sns:${region}:${accountId}:${TOPIC_NAME}`;
  const issues: string[] = [];

  console.log(`Health check running for date: ${today}`);

  const supabase = getSupabaseClient();

  // ─── LoseIt checks ──────────────────────────────────────────────────────
  const { data: loseitPuzzle, error: loseitError } = await supabase
    .from('puzzles')
    .select('*')
    .eq('date', today)
    .single();

  if (loseitError || !loseitPuzzle) {
    issues.push(`FAILURE: LoseIt puzzle MISSING for ${today}`);
  } else {
    const validation = validateWord(loseitPuzzle.word);
    if (!validation.solvable) {
      issues.push(`FAILURE: LoseIt puzzle NOT SOLVABLE: "${loseitPuzzle.word}" — ${validation.reason}`);
    }
    if (loseitPuzzle.used_fallback) {
      issues.push(`WARNING: LoseIt used fallback word for ${today}`);
    }
    console.log(`LoseIt puzzle: ${loseitPuzzle.word} (fallback: ${loseitPuzzle.used_fallback})`);
  }

  // ─── Dead Letters checks ─────────────────────────────────────────────────
  const { data: dlPuzzle, error: dlError } = await supabase
    .from('dl_puzzles')
    .select('*')
    .eq('date', today)
    .single();

  if (dlError || !dlPuzzle) {
    issues.push(`FAILURE: Dead Letters puzzle MISSING for ${today}`);
  } else {
    if (!dlPuzzle.consonants || dlPuzzle.consonants.length < 3) {
      issues.push(`FAILURE: Dead Letters has < 3 consonants: "${dlPuzzle.consonants}"`);
    }
    if (!isValidWord(dlPuzzle.word)) {
      issues.push(`FAILURE: Dead Letters word "${dlPuzzle.word}" is NOT in dictionary`);
    }
    if (dlPuzzle.used_fallback) {
      issues.push(`WARNING: Dead Letters used fallback word for ${today}`);
    }
    console.log(`Dead Letters puzzle: ${dlPuzzle.word} (consonants: ${dlPuzzle.consonants}, fallback: ${dlPuzzle.used_fallback})`);
  }

  // ─── Report results ──────────────────────────────────────────────────────
  if (issues.length > 0) {
    const message = `Cleva.Me Health Check — ${today}\n\n${issues.join('\n')}\n\nCheck CloudWatch logs for details.`;
    console.warn('Issues found:', issues);

    await sns.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: 'Cleva.Me Puzzle Alert',
      Message: message,
    }));
    console.log('Alert published to SNS');
  } else {
    console.log('All checks passed — no alert needed');
  }
}
