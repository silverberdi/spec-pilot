# Current State

Lifecycle: `w00-s03-apply-in-progress`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w00`
- Active change: `chg-w00-s03-postgresql-prisma-and-local-runtime` (apply in progress; not Verified/archived)
- Completed archived slice: `w00-s02-nx-angular-nest-baseline`
- Bound User Stories (active): `us-w00-s03-postgresql-prisma-and-local-runtime-001`, `...-002`, `...-003`
- Cursor is the only current implementer.
- Cline with DeepSeek is optional and read-only when used for validation.
- Codex and OpenCode have no current project role.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Persistence baseline: Prisma 7.9.0 + PostgreSQL (`apps/api/prisma`), readiness at `GET /health/ready`, Compose project `specpilot` with Postgres on host port `5441` (isolated from foreign `axioma-db-dev` on `5440`).
- Application baseline present: Nx 23.1.0 package-based monorepo with `apps/web`, `apps/api`, and `packages/shared-contracts`.
- Next gate: operator human validation, then Verify / sync / archive / commit.