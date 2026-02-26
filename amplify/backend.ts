/**
 * Amplify Gen 2 Backend Definition
 *
 * Defines all Lambda functions and wires them up with:
 *   - Lambda function URLs (HTTPS endpoints, no API Gateway needed for MVP)
 *   - AWS EventBridge Scheduler for the daily 00:00 ET cron job (both games)
 *   - Monitoring: SNS alerts, CloudWatch alarms, daily health-check
 *   - Amplify outputs so the frontend knows the function URLs
 */

import { defineBackend } from '@aws-amplify/backend';
import { getPuzzle } from './functions/get-puzzle/resource.js';
import { generatePuzzle } from './functions/generate-puzzle/resource.js';
import { submitScore } from './functions/submit-score/resource.js';
import { getLeaderboard } from './functions/get-leaderboard/resource.js';
import { getDLPuzzle } from './functions/get-dl-puzzle/resource.js';
import { generateDLPuzzle } from './functions/generate-dl-puzzle/resource.js';
import { healthCheck } from './functions/health-check/resource.js';

import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Duration, Stack } from 'aws-cdk-lib';

const backend = defineBackend({
  getPuzzle,
  generatePuzzle,
  submitScore,
  getLeaderboard,
  getDLPuzzle,
  generateDLPuzzle,
  healthCheck,
});

// ─── Lambda Function URLs ──────────────────────────────────────────────────

const corsConfig = {
  allowedOrigins: ['*'],
  allowedMethods: [HttpMethod.ALL],
  allowedHeaders: ['*'],
};

// DropIt function URLs
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

// DropIt daily puzzle generation
new Rule(cronStack, 'DailyPuzzleRule', {
  ruleName: 'dropit-daily-puzzle',
  description: "Generates today's DropIt puzzle at midnight Eastern time (05:00 UTC)",
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

// ─── Monitoring: SNS Topic + CloudWatch Alarms + Health-Check ────────────

const monitoringStack = backend.createStack('MonitoringStack');

// SNS topic for all puzzle alerts
const alertTopic = new Topic(monitoringStack, 'PuzzleAlertTopic', {
  topicName: 'puzzle-alerts',
  displayName: 'Cleva.Me Puzzle Alerts',
});

alertTopic.addSubscription(
  new EmailSubscription('cwright@metrocoresolutions.io')
);

// CloudWatch alarm: DropIt generator errors
const dropitAlarm = new Alarm(monitoringStack, 'DropItGeneratorErrorAlarm', {
  alarmName: 'dropit-generator-errors',
  alarmDescription: 'DropIt puzzle generator Lambda errors',
  metric: generatePuzzleLambda.metricErrors({
    period: Duration.hours(1),
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
});
dropitAlarm.addAlarmAction(new SnsAction(alertTopic));

// CloudWatch alarm: Dead Letters generator errors
const dlAlarm = new Alarm(monitoringStack, 'DLGeneratorErrorAlarm', {
  alarmName: 'dl-generator-errors',
  alarmDescription: 'Dead Letters puzzle generator Lambda errors',
  metric: generateDLPuzzleLambda.metricErrors({
    period: Duration.hours(1),
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
});
dlAlarm.addAlarmAction(new SnsAction(alertTopic));

// Health-check Lambda: daily at 05:15 UTC (15 min after puzzle generation)
const healthCheckLambda = backend.healthCheck.resources.lambda;

// Grant sns:Publish with a name-based ARN pattern (no cross-stack reference)
healthCheckLambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['sns:Publish'],
  resources: ['arn:aws:sns:*:*:puzzle-alerts'],
}));

// Place EventBridge rule in the health-check Lambda's own stack to avoid
// circular dependencies (EventBridge target adds a Lambda invoke permission
// that would create a back-reference if placed in a different stack)
const healthCheckStack = Stack.of(healthCheckLambda);

new Rule(healthCheckStack, 'DailyHealthCheckRule', {
  ruleName: 'daily-health-check',
  description: 'Runs puzzle health checks at 05:15 UTC (15 min after generation)',
  schedule: Schedule.cron({ minute: '15', hour: '5' }),
  targets: [new LambdaFunction(healthCheckLambda)],
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
