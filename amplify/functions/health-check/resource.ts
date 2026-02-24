import { defineFunction } from '@aws-amplify/backend-function';

export const healthCheck = defineFunction({
  name: 'health-check',
  entry: './handler.ts',
  environment: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  timeoutSeconds: 30,
  memoryMB: 256,
});
