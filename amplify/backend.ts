/**
 * Amplify Gen 2 Backend Definition
 *
 * Defines all Lambda functions and wires them up with:
 *   - Lambda function URLs (HTTPS endpoints, no API Gateway needed for MVP)
 *   - AWS EventBridge Scheduler for the daily 00:00 ET cron job (both games)
 *   - Amplify outputs so the frontend knows the function URLs
 */

import { defineBackend } from '@aws-amplify/backend';
import { getPuzzle } from './functions/get-puzzle/resource.js';
import { generatePuzzle } from './functions/generate-puzzle/resource.js';
import { submitScore } from './functions/submit-score/resource.js';
import { getLeaderboard } from './functions/get-leaderboard/resource.js';
import { getDLPuzzle } from './functions/get-dl-puzzle/resource.js';
import { generateDLPuzzle } from './functions/generate-dl-puzzle/resource.js';

import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

const backend = defineBackend({
  getPuzzle,
  generatePuzzle,
  submitScore,
  getLeaderboard,
  getDLPuzzle,
  generateDLPuzzle,
});

// ─── Lambda Function URLs ──────────────────────────────────────────────────

const corsConfig = {
  allowedOrigins: ['*'],
  allowedMethods: [HttpMethod.ALL],
  allowedHeaders: ['*'],
};

// LoseIt function URLs
const getPuzzleLambda = backend.getPuzzle.resources.lambda;
const getPuzzleUrl = getPuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

const generatePuzzleLambda = backend.generatePuzzle.resources.lambda;
const generatePuzzleUrl = generatePuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// Shared function URLs (submit-score, get-leaderboard)
const submitScoreLambda = backend.submitScore.resources.lambda;
const submitScoreUrl = submitScoreLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

const getLeaderboardLambda = backend.getLeaderboard.resources.lambda;
const getLeaderboardUrl = getLeaderboardLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// Dead Letters function URLs
const getDLPuzzleLambda = backend.getDLPuzzle.resources.lambda;
const getDLPuzzleUrl = getDLPuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

const generateDLPuzzleLambda = backend.generateDLPuzzle.resources.lambda;
const generateDLPuzzleUrl = generateDLPuzzleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: corsConfig,
});

// ─── EventBridge Rules (daily cron at 05:00 UTC = midnight ET) ───────────

const cronStack = backend.createStack('CronStack');

// LoseIt daily puzzle generation
new Rule(cronStack, 'DailyPuzzleRule', {
  ruleName: 'loseit-daily-puzzle',
  description: "Generates today's LoseIt puzzle at midnight Eastern time (05:00 UTC)",
  schedule: Schedule.cron({ minute: '0', hour: '5' }),
  targets: [new LambdaFunction(generatePuzzleLambda)],
});

// Dead Letters daily puzzle generation
new Rule(cronStack, 'DailyDLPuzzleRule', {
  ruleName: 'dead-letters-daily-puzzle',
  description: "Generates today's Dead Letters puzzle at midnight Eastern time (05:00 UTC)",
  schedule: Schedule.cron({ minute: '0', hour: '5' }),
  targets: [new LambdaFunction(generateDLPuzzleLambda)],
});

// ─── Amplify Outputs (makes URLs available during deployment) ─────────────

backend.addOutput({
  custom: {
    getPuzzleUrl: getPuzzleUrl.url,
    generatePuzzleUrl: generatePuzzleUrl.url,
    submitScoreUrl: submitScoreUrl.url,
    getLeaderboardUrl: getLeaderboardUrl.url,
    getDLPuzzleUrl: getDLPuzzleUrl.url,
    generateDLPuzzleUrl: generateDLPuzzleUrl.url,
  },
});
