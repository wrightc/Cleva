/**
 * Amplify Gen 2 Backend Definition
 *
 * Defines all Lambda functions and wires them up with:
 *   - Lambda function URLs (HTTPS endpoints, no API Gateway needed for MVP)
 *   - AWS EventBridge Scheduler for the daily 00:00 UTC cron job
 *   - Amplify outputs so the frontend knows the function URLs
 */

import { defineBackend } from '@aws-amplify/backend';
import { getPuzzle } from './functions/get-puzzle/resource.js';
import { generatePuzzle } from './functions/generate-puzzle/resource.js';
import { submitScore } from './functions/submit-score/resource.js';
import { getLeaderboard } from './functions/get-leaderboard/resource.js';

import { Stack } from 'aws-cdk-lib';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

const backend = defineBackend({
  getPuzzle,
  generatePuzzle,
  submitScore,
  getLeaderboard,
});

// ─── Lambda Function URLs ──────────────────────────────────────────────────

const corsConfig = {
  allowedOrigins: ['*'],
  allowedMethods: [HttpMethod.ALL],
  allowedHeaders: ['*'],
};

// get-puzzle URL
const getPuzzleLambda = backend.getPuzzle.resources.lambda;
const getPuzzleUrl = getPuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// generate-puzzle URL (for admin manual trigger)
const generatePuzzleLambda = backend.generatePuzzle.resources.lambda;
const generatePuzzleUrl = generatePuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// submit-score URL
const submitScoreLambda = backend.submitScore.resources.lambda;
const submitScoreUrl = submitScoreLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// get-leaderboard URL
const getLeaderboardLambda = backend.getLeaderboard.resources.lambda;
const getLeaderboardUrl = getLeaderboardLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// ─── EventBridge Rule (daily cron at 00:00 UTC) ───────────────────────────

const cronStack = backend.createStack('CronStack');

// EventBridge Rule using aws-events (simpler, stable API)
new Rule(cronStack, 'DailyPuzzleRule', {
  ruleName: 'shrinking-word-daily-puzzle',
  description: "Generates the next day's Shrinking Word puzzle at midnight UTC",
  schedule: Schedule.cron({ minute: '0', hour: '0' }),
  targets: [new LambdaFunction(generatePuzzleLambda)],
});

// ─── Amplify Outputs (makes URLs available during deployment) ─────────────

backend.addOutput({
  custom: {
    getPuzzleUrl: getPuzzleUrl.url,
    generatePuzzleUrl: generatePuzzleUrl.url,
    submitScoreUrl: submitScoreUrl.url,
    getLeaderboardUrl: getLeaderboardUrl.url,
  },
});
