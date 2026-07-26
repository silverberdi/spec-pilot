## Why

`w00-s02` delivered a runnable Nx/Angular/Nest baseline, but SpecPilot still has no operational database, Prisma migration path, or reproducible multi-service local runtime. Later product waves depend on PostgreSQL as the sole operational store (ADR-003); this slice establishes that persistence and Docker Compose baseline now so domain features are not built on an undefined data plane.

## What Changes

- Add a PostgreSQL + Prisma persistence baseline: schema location, Prisma client integration, migration workflow, and local connection configuration suitable for native macOS and Compose-backed development.
- Keep the baseline schema bounded to foundation persistence (migration/tooling readiness and any minimal models required to prove connectivity)—not product domain tables for projects, reviews, budgets, or auth.
- Wire the NestJS API to Prisma so database connectivity failures are explicit and safe (no silent success against an invalid data plane).
- Introduce Docker Compose local runtime for PostgreSQL and the existing foundation services needed to run SpecPilot locally (`api`, `web`, and Postgres), with documented operator commands; native macOS development remains supported.
- Add deterministic automated coverage for the persistence/runtime success path and at least one meaningful blocked/failure path (including Testcontainers-backed API/persistence checks where applicable).
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w00` |
| Slice | `w00-s03-postgresql-prisma-and-local-runtime` |
| Change | `chg-w00-s03-postgresql-prisma-and-local-runtime` |
| User Stories | `us-w00-s03-postgresql-prisma-and-local-runtime-001`, `us-w00-s03-postgresql-prisma-and-local-runtime-002`, `us-w00-s03-postgresql-prisma-and-local-runtime-003` |
| Implementer | Cursor |
| Dependencies | Completed and archived `chg-w00-s02-nx-angular-nest-baseline` (Nx monorepo, `apps/web`, `apps/api`, shared contracts, application tests); ADR-003 PostgreSQL-only persistence; binding main-only working policy and existing governance validators remain in force |
| Exclusions | CI/CD pipelines and later-slice quality/security gates (`w00-s04`); `apps/worker` product scaffolding; Redis or non-PostgreSQL stores; DeepSeek product API integration; authentication/multiuser; product domain modules and domain tables (project registry, reviews, findings, budget, prompts, etc.); full light/dark/system theme and accessibility polish (`w08-s03`); Playwright product E2E ownership beyond what this slice explicitly requires; and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Enables SpecPilot’s local-first operational persistence and a reproducible multi-service runtime so later waves can store audit trail and product state on PostgreSQL. |
| Security / privacy | Database credentials and local env files must not be committed; secret-scan/baseline validators remain applicable; no authentication or multiuser model. |
| Persistence | Introduces PostgreSQL as the operational store with Prisma ORM and migrations; SQLite and alternate stores remain excluded. |
| UI / API | Compose-backed local runtime for existing web/API baselines; API gains explicit persistence connectivity/failure behavior. Product domain UI/API features remain out of scope. |
| Tests | Automated success + blocked/failure evidence for persistence and local runtime; Testcontainers PostgreSQL for API/persistence integration where required by design. |
| Migration | Greenfield Prisma migration baseline for empty/local databases; no production data migration and no `w09` ownership migration. |
| Rollback | Reversible by stopping Compose, dropping the local database volume, and reverting Prisma/Compose/config files; no destructive remote recovery. |
| Human validation | Operator confirms Compose (or documented native) Postgres + API/web path and failure behavior; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `postgresql-prisma-persistence-baseline`: PostgreSQL + Prisma schema, client, migrations, and connection configuration baseline that proves durable connectivity without introducing later-wave domain models.
- `docker-compose-local-runtime`: Docker Compose local runtime for PostgreSQL and the foundation `api`/`web` services, with operator-facing runbooks and env conventions; native macOS development remains supported.

### Modified Capabilities

- `nestjs-fastify-api-baseline`: Extend the API baseline so Prisma/PostgreSQL wiring is required and invalid database configuration or connectivity fails safely; supersede the `w00-s02` rule that forbade any database readiness behavior (exact readiness vs liveness split is a design decision).
- `application-test-baseline`: Extend automated test expectations to cover persistence/runtime success and at least one meaningful blocked/failure path, including Testcontainers-backed PostgreSQL checks where the design places them.

## Impact

- **Repository files:** Prisma schema/migrations, Compose and env examples, API Prisma module/wiring, docs/context and package-summary updates; possible shared persistence package if design places the client outside `apps/api`.
- **Dependencies:** Prisma client/CLI, PostgreSQL runtime (Compose image and/or local), Testcontainers (or equivalent) for persistence integration tests; no Redis, no CI workflow ownership.
- **OpenSpec:** New capability specs under this change plus deltas for `nestjs-fastify-api-baseline` and `application-test-baseline`; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No `w00-s04` CI gates; no worker app; no DeepSeek gateway; no auth; no product domain modules/tables; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Later slices and waves would invent ad-hoc persistence and runtime wiring, violating ADR-003 and weakening bounded, verifiable delivery.
