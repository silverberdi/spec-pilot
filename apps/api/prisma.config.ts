import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 CLI / Migrate configuration for apps/api.
 * Connection URL lives here (not in schema.prisma).
 * Native macOS: DATABASE_URL → localhost:5441
 * Compose api: DATABASE_URL → postgres:5432
 *
 * Prefer process.env so `prisma generate` can run during Docker builds
 * with a non-secret placeholder URL; migrate deploy / runtime still require
 * a real DATABASE_URL.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://specpilot:specpilot@localhost:5441/specpilot?schema=public',
  },
});
