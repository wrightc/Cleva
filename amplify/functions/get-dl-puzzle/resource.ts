import { defineFunction } from '@aws-amplify/backend-function';

export const getDLPuzzle = defineFunction({
  name: 'get-dl-puzzle',
  entry: './handler.ts',
  environment: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? '*',
  },
  timeoutSeconds: 10,
  memoryMB: 256,
});
