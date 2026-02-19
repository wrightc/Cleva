import { defineFunction } from '@aws-amplify/backend-function';

export const generatePuzzle = defineFunction({
  name: 'generate-puzzle',
  entry: './handler.ts',
  environment: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    ADMIN_SECRET: process.env.ADMIN_SECRET ?? '',
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? '*',
  },
  timeoutSeconds: 60,  // Puzzle generation can take up to 5 retries
  memoryMB: 512,       // Larger memory for BFS validation
});
