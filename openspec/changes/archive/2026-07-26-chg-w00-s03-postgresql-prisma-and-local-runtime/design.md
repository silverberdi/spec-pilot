## Context

Wave `w00` slices `w00-s01` (governance/OpenSpec foundation) and `w00-s02` (Nx monorepo, Angular 22 `apps/web`, NestJS 11/Fastify 5 `apps/api`, `packages/shared-contracts`, Jest test baseline) are complete and archived. The workspace runs on npm workspaces, Node.js 24.18.0, TypeScript 6.0.3, Nx 23.1.0, with a single root `package-lock.json` and no peer-dependency bypasses.

SpecPilot still has no operational database, no Prisma schema or migration path, and no reproducible multi-service local runtime. ADR-003 binds PostgreSQL as the only operational store; the technology decisions bind Prisma ORM with migrations and local Docker Compose deployment while preserving native macOS development.

The `w00-s02` canonical spec `nestjs-fastify-api-baseline` currently forbids any database readiness behavior on the health surface. This slice supersedes that restriction in a bounded way (see D4).

Stakeholders: SpecPilot operator (human validation and approvals); Cursor (sole implementer). Main-only working policy, operator approval gates, and governance validators remain binding.

## Goals / Non-Goals

**Goals:**

- Establish the PostgreSQL + Prisma persistence baseline: schema location, generated client, migration workflow, and connection configuration usable both natively on macOS and under Compose.
- Prove durable connectivity with a minimal, non-domain data model and at least one applied Prisma migration.
- Wire `apps/api` to Prisma so invalid database configuration or unreachable connectivity is explicit and safe—never silent success against an invalid data plane.
- Provide a Docker Compose local runtime for PostgreSQL plus the existing foundation services (`api`, `web`) with documented, copyable operator commands.
- Deliver deterministic automated evidence: success paths plus at least one meaningful blocked/failure path, including Testcontainers-backed PostgreSQL integration checks.
- Keep governance scripts, docs/context inventory, and `package-summary.json` synchronized.

**Non-Goals:**

- Product domain tables or modules (projects, reviews, findings, budgets, prompts, usage, auth/users). The baseline schema proves the persistence plane only.
- `apps/worker` and its Compose service (no worker app exists yet; it joins Compose in its own slice).
- CI/CD pipelines and later-slice quality/security gates (`w00-s04`).
- Redis, SQLite, or any non-PostgreSQL store (ADR-003).
- DeepSeek integration, authentication/multiuser, SSE product streams.
- Playwright product E2E ownership; remote/production deployment, backups, or replication.
- Editing OpenSpec-generated integrations except via `openspec update`.
- Branches, PRs, `--legacy-peer-deps`, `--force`, or any deviation from the main-only working policy.
- Reusing, modifying, restarting, stopping, or deleting any Docker resource that does not belong to SpecPilot's Compose project—including the pre-existing foreign container `axioma-db-dev` (image `postgres:16-alpine`, host port `5440`, internal port `5432`), its network, database, credentials, and volumes.

## Decisions

### D1 — Prisma owned by `apps/api`; no shared persistence package yet

The Prisma schema lives at `apps/api/prisma/schema.prisma` with migrations under `apps/api/prisma/migrations/`. The generated client is consumed only by `apps/api` through a dedicated Nest `PrismaModule`/`PrismaService` that manages connect/disconnect lifecycle.

- *Alternative considered:* a `packages/persistence` shared package now. Rejected — only the API touches the database in wave `w00`; extracting a package before a second consumer exists is premature abstraction.
- *Alternative considered:* schema at repository root. Rejected — the API is the single data-plane owner; keeping schema inside `apps/api` matches module boundaries and Nx project graph ownership.

### D2 — Versions: Prisma and PostgreSQL majors resolved and locked at apply

Bind the current stable Prisma major (CLI and client on exactly the same version) compatible with Node.js 24.18.0 and TypeScript 6.0.3, resolved from the npm registry during apply, recorded in evidence, and locked in the single root `package-lock.json`. Bind the current stable PostgreSQL major as a pinned, digest-or-tag-explicit official image in Compose (no `latest` tag); record the resolved image in evidence. `npm install` must remain clean without peer-dependency bypasses.

- *Alternative considered:* pin concrete minor/patch versions in planning. Rejected — mirrors the s02 pattern: majors and floors are binding in planning; concrete resolutions happen at apply with evidence and lockfile.
- *Alternative considered:* PostgreSQL `latest` image. Rejected — non-reproducible runtime; violates deterministic evidence expectations.

### D3 — Minimal baseline model: one operational metadata table

The baseline schema defines exactly one non-domain table (e.g. `app_metadata` with `key` primary key, `value`, timestamps) used to prove migration application and a full round trip (insert/read) through Prisma. It is explicitly a persistence-plane probe, not the start of the product data model; later waves add domain models through their own changes and migrations.

- *Alternative considered:* empty schema (datasource only). Rejected — proves connection but not the migration + typed-client round trip the slice must evidence.
- *Alternative considered:* seed early domain tables "while we're here". Rejected — later-slice/wave scope; violates bounded delivery.

### D4 — Health surface: liveness unchanged, readiness added

`GET /health` keeps the exact `w00-s02` liveness contract `{ "status": "ok", "service": "api" }` with no database dependency, so process liveness stays decoupled from the data plane. This slice adds `GET /health/ready` as the readiness surface: it returns HTTP 200 with `{ "status": "ok", "service": "api", "database": "ok" }` only when a Prisma connectivity probe succeeds, and HTTP 503 with an explicit non-ok database status otherwise. The `w00-s02` prohibition on database readiness behavior is superseded by delta spec: the prohibition now applies to the liveness route only.

- *Alternative considered:* fold database status into `GET /health`. Rejected — breaks the stable liveness contract and conflates orchestration liveness with readiness; Compose and operators need both signals.
- *Alternative considered:* no readiness endpoint (rely on logs). Rejected — User Story `-003` requires clear operator-visible success/error behavior for the new surface.

### D5 — Configuration and startup failure semantics

Database configuration comes from the environment: `DATABASE_URL` (and Compose-provided Postgres credentials that belong only to SpecPilot). At startup the API validates presence and basic shape of `DATABASE_URL`; if missing or malformed, the process exits non-zero with a clear error—no partially configured serving. If `DATABASE_URL` is well-formed but the database is unreachable, the API serves liveness, logs the failure explicitly, and reports readiness 503 until connectivity succeeds; it never fabricates readiness success.

Connection targets are fixed by coexistence policy:

- Native macOS development MUST use `DATABASE_URL` pointing at `localhost:5441` (SpecPilot's published host port).
- The Compose `api` service MUST use `DATABASE_URL` pointing at the Compose service hostname `postgres` on internal port `5432`.
- SpecPilot MUST NOT use host port `5440`, container `axioma-db-dev`, or any Axioma credentials/database as its data plane.

A committed `.env.example` documents placeholders only, including the `localhost:5441` native-dev pattern. Real `.env` files are gitignored; no credentials are committed. Local defaults (host port `5441`, SpecPilot-only database name, and SpecPilot-only dev user/password for the isolated Compose Postgres) are documented as non-secret development values and MUST remain distinct from `axioma-db-dev`.

- *Alternative considered:* crash on unreachable database at startup. Rejected — in a local-first workflow Postgres frequently starts after the API; readiness 503 is explicit and safe while remaining operable. Missing/malformed configuration still fails fast because it is a configuration defect, not a transient condition.
- *Alternative considered:* reuse `axioma-db-dev` on host port `5440` for SpecPilot. Rejected — that container and its data belong to another project; SpecPilot must remain fully isolated.

### D6 — Docker Compose runtime shape and safe coexistence

A single SpecPilot-owned `compose.yaml` at the repository root defines an isolated local runtime that coexists with the operator's pre-existing foreign Postgres container `axioma-db-dev` (`postgres:16-alpine`, host `5440` → internal `5432`) without sharing, modifying, restarting, or deleting that container or any of its networks, volumes, databases, or credentials.

Binding isolation for SpecPilot Postgres:

- Explicit container / Compose project naming that avoids collision (container name `specpilot-postgres`; Compose project name scoped to SpecPilot).
- Internal PostgreSQL port: `5432`.
- Published host port: **`5441` only** (not `5440`).
- Exclusive named volume, e.g. `specpilot-postgres-data`.
- Exclusive Compose network belonging to the SpecPilot project.
- SpecPilot-only database name, user, and local-development credentials, distinct from Axioma.

Services:

- `postgres` (`specpilot-postgres`): pinned official image, exclusive named volume, `pg_isready` healthcheck, host mapping `5441:5432`, SpecPilot-only non-secret local credentials.
- `api`: built from the repository (Node 24-compatible Dockerfile), depends on healthy SpecPilot `postgres`, receives `DATABASE_URL` targeting hostname `postgres` port `5432`, runs `prisma migrate deploy` before starting NestJS.
- `web`: built from the repository (reproducible Dockerfile that produces the Angular production build and serves it via an appropriate HTTP server), reachable from the host.

Before any Compose up during apply or evidence capture: verify host port `5441` is free. If `5441` is occupied, **stop and report**—do not silently choose another port. Capture evidence before and after Compose operations proving `axioma-db-dev` remains intact (same identity, not restarted/modified by SpecPilot commands) and that host port `5440` remains reserved for Axioma.

Native macOS development remains supported: run only SpecPilot `postgres` via Compose and run `api`/`web` natively with `DATABASE_URL` at `localhost:5441`. No worker service. No CI usage of Compose in this slice.

Operator runbooks and reset/down commands MUST operate only on SpecPilot Compose project resources (containers, network, and `specpilot-postgres-data`). They MUST NEVER target `axioma-db-dev` or foreign volumes/networks. `docker compose down --volumes` MUST be invoked only against the SpecPilot Compose project directory/project name—never as a global or foreign-project operation.

- *Alternative considered:* Compose for Postgres only. Rejected — the slice explicitly owns the multi-service local runtime for existing foundation services; API/web services make the runtime reproducible end to end.
- *Alternative considered:* Kubernetes/devcontainers. Rejected — technology decision is local Docker Compose.
- *Alternative considered:* share `axioma-db-dev` / port `5440`. Rejected — foreign project ownership; isolation is binding.
- *Alternative considered:* auto-pick an alternate host port if `5441` is busy. Rejected — silent port drift breaks runbooks and evidence; stop and report instead.

### D7 — Migration workflow

Development uses `prisma migrate dev` to author migrations; committed migrations are applied deterministically with `prisma migrate deploy` (used by the Compose `api` service and by evidence runs). Migration files are committed and immutable once applied to shared history; corrections happen via new migrations. `prisma db push` and `migrate reset` are development-only conveniences, never part of documented operator runbooks for shared state.

- *Alternative considered:* schema-push-only workflow without migration files. Rejected — technology decision binds migrations; auditability requires committed migration history.

### D8 — Test strategy and evidence

Jest remains the single runner (s02 decision). Evidence minimum:

1. **Unit (no Docker):** configuration validation failure path — missing/malformed `DATABASE_URL` causes startup rejection; readiness handler maps probe failure to 503 with explicit non-ok payload.
2. **Integration (Testcontainers PostgreSQL):** start an ephemeral pinned-major Postgres container; apply committed migrations with `migrate deploy`; execute the `app_metadata` round trip through the Prisma client; verify readiness success against the live container and readiness failure after the container becomes unavailable (or against an unreachable URL).
3. **Runtime evidence:** Compose up with `postgres`+`api`+`web`; captured outputs for healthy readiness, liveness, web reachability; and one blocked path (e.g. stopped Postgres → readiness 503) recorded under `evidence/`.

Testcontainers is a devDependency used only by tests; it requires local Docker, which this slice already assumes for Compose. Existing s02 test suites must keep passing.

- *Alternative considered:* mock Prisma for integration coverage. Rejected — the slice exists to prove a real persistence plane; mocks cannot evidence migrations or connectivity.

### D9 — Security, privacy, observability

- No committed secrets: `.env` gitignored, `.env.example` placeholders only, Compose dev credentials are documented non-secret local values; `scripts/scan-secrets.py` and baseline validation remain mandatory before operator-approved commit/push.
- No authentication (single local user model unchanged). Postgres is bound for local development use; no remote exposure is configured.
- Observability limited to structured startup/connection logs, readiness HTTP semantics, exit codes, and test output. No APM or product audit log yet.

### D10 — Docs, inventory, and lifecycle (reuse s01/s02 pattern)

Evidence lives under this change's `evidence/` directory. After implementation: update `docs/context/**` (current state, file index), regenerate `package-summary.json`, and document operator runbooks (Compose up/down, migration commands, native-dev variant) using hyphenated OpenSpec command syntax where OpenSpec commands are referenced. Canonical spec sync and archive happen only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [Prisma or Testcontainers incompatibility with Node 24.18.0 / TS 6.0.3 at apply time] → Resolve concrete versions at apply, verify against the locked toolchain before generating code, record in evidence; stop and reconcile planning rather than bypass peers.
- [Readiness delta conflicts with the canonical s02 "no database readiness" requirement] → Explicit delta spec modifies `nestjs-fastify-api-baseline`: prohibition narrowed to the liveness route; readiness is a distinct route with its own contract.
- [Docker unavailable on the operator machine when evidence is captured] → Compose and Testcontainers evidence require Docker; if absent, stop and report—do not substitute fake or mocked "integration" evidence.
- [Compose `api` image drift vs native dev behavior] → Same migration command (`migrate deploy`) and same `DATABASE_URL` contract in both paths; runbooks document the single source of truth.
- [Postgres data volume persists stale schema across experiments] → Runbooks include an explicit reset procedure scoped only to SpecPilot Compose (`down` + removal of `specpilot-postgres-data`) marked destructive-local-only; never part of automated flows; never touches foreign volumes.
- [Accidental interference with pre-existing `axioma-db-dev` on host port `5440`] → SpecPilot uses exclusive names (`specpilot-postgres`, exclusive network, `specpilot-postgres-data`), publishes only `5441`, documents distinct credentials, forbids runbooks/commands against foreign Docker resources, captures before/after coexistence evidence, and never runs `docker compose down --volumes` outside the SpecPilot Compose project.
- [Host port `5441` already occupied at apply time] → Stop immediately and report; do not silently remapp to another port.
- [Baseline `app_metadata` table mistaken for the start of the domain model] → Schema comments and specs state it is a persistence probe; domain models arrive via later-wave changes.
- [Secrets leaking via `.env` or Compose files] → Only placeholder/example values committed; secret scan gates every commit; real env files gitignored.
- [Migration files edited after application] → Workflow rule (D7): applied migrations are immutable; corrections are new migrations.
- [Scope creep toward worker/CI/Redis] → Non-goals list is binding; tasks reject excluded scaffolding.

## Migration Plan

1. Resolve and record concrete Prisma (CLI + client, same version) and PostgreSQL image versions; clean `npm install` with the root lockfile updated—no peer bypasses.
2. Add Prisma to `apps/api`: `schema.prisma` (datasource + generator + `app_metadata` model), initial migration, generated client wiring via `PrismaModule`/`PrismaService`.
3. Implement startup `DATABASE_URL` validation (fail fast non-zero when missing/malformed) and the `GET /health/ready` readiness contract (200 ok / 503 explicit failure); keep `GET /health` liveness byte-stable.
4. Capture pre-Compose coexistence evidence: confirm `axioma-db-dev` is intact, host `5440` remains reserved for Axioma, host `5441` is free for SpecPilot, and SpecPilot container/network/volume names do not collide. If `5441` is occupied, stop and report without remapping.
5. Add SpecPilot-only `compose.yaml` (postgres/api/web per D6, container `specpilot-postgres`, host `5441:5432`, exclusive volume/network/credentials), reproducible Dockerfiles, `.env.example` with `localhost:5441` native pattern, and gitignore coverage for real env files.
6. Bring up only the SpecPilot Compose project; capture post-Compose coexistence evidence proving `axioma-db-dev` was not modified or restarted by SpecPilot commands.
7. Add Jest unit tests (config failure, readiness failure mapping) and Testcontainers integration tests (migrate deploy, round trip, readiness success/failure). Testcontainers remains ephemeral and independent of both SpecPilot Compose Postgres and `axioma-db-dev`.
8. Capture SpecPilot Compose runtime evidence: success path and a blocked path; native-dev variant commands use `localhost:5441` only.
9. Run governance validators (secret scan, baseline, delivery graph, package-summary regeneration); update `docs/context/**` and operator runbooks scoped exclusively to SpecPilot Compose resources.
10. With operator approval after reported validations: commit on `main` (and push if requested).
11. With operator approval: Verify exactly `PASS`, sync canonical specs (including the `nestjs-fastify-api-baseline` and `application-test-baseline` deltas), archive.

**Rollback:** revert the slice's commits on `main`; stop only the SpecPilot Compose project and remove only SpecPilot-owned resources (e.g. `specpilot-postgres-data`); delete local SpecPilot `.env`. Rollback MUST NOT stop, restart, modify, or delete `axioma-db-dev` or any foreign Docker network/volume/database. No remote systems or shared SpecPilot databases exist, so no external SpecPilot rollback is required.

## Open Questions

- None blocking planning. Prisma major/version and the PostgreSQL image tag are resolved and evidenced at apply time; the readiness route path (`/health/ready`) and payload contract are fixed by D4; SpecPilot host port `5441`, container name `specpilot-postgres`, and isolation from `axioma-db-dev` / host `5440` are binding coexistence decisions.
