# Prisma / SpecPilot persistence toolchain

| Item | Value |
|---|---|
| Node.js | 24.18.0 |
| TypeScript | 6.0.3 |
| Prisma CLI | 7.9.0 |
| @prisma/client | 7.9.0 |
| @prisma/adapter-pg | 7.9.0 |
| pg | 8.22.0 |
| testcontainers | 12.0.4 |
| @testcontainers/postgresql | 12.0.4 |
| PostgreSQL Compose image | `postgres:16-alpine` (pinned tag; not `latest`) |
| SpecPilot host port | 5441 |
| SpecPilot container | `specpilot-postgres` |
| SpecPilot volume | `specpilot-postgres-data` |
| SpecPilot network | `specpilot-net` |
| Foreign coexistence | `axioma-db-dev` on host 5440 — untouched |

## Prisma 7 notes

Connection URL is configured in `apps/api/prisma.config.ts` (not in `schema.prisma`). Runtime `PrismaClient` uses `@prisma/adapter-pg` with a `pg` Pool. CLI and client are identical version 7.9.0. `npm install` completed without `--legacy-peer-deps` or `--force`.
