import { defineFunction } from '@aws-amplify/backend-function';

export const generatePuzzle = defineFunction({
  name: 'generate-puzzle',
  entry: './handler.ts',
  environment: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? '*',
  },
  timeoutSeconds: 15,   // No API calls, just DB query + quick validation
  memoryMB: 256,         // Lighter workload without Claude
});
