## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w00`, slice `w00-s03-postgresql-prisma-and-local-runtime`, User Stories `001–003`, Cursor as implementer, dependencies on archived `chg-w00-s02-nx-angular-nest-baseline`, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no CI ownership (`w00-s04`), no `apps/worker`, no Redis/SQLite, no DeepSeek product integration, no authentication, no product domain tables/modules, no reuse/modification of foreign Docker resources including `axioma-db-dev`, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Prisma persistence baseline (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 2.1 Resolve concrete Prisma CLI and client versions (identical), compatible with Node.js 24.18.0 and TypeScript 6.0.3; add them via clean `npm install` without `--legacy-peer-deps`, `--force`, or peer bypass; record versions in `evidence/toolchain.md` and lock them in the root `package-lock.json`
- [x] 2.2 Create `apps/api/prisma/schema.prisma` with PostgreSQL datasource, client generator, and exactly one non-domain `app_metadata` probe model; confirm no product domain models are present
- [x] 2.3 Generate the initial Prisma migration under `apps/api/prisma/migrations/` and leave the migration files in the working tree ready to be versioned in the change's final closure commit; apply it with `prisma migrate deploy` for deterministic evidence; do NOT create any Git commit during implementation (commits happen only at the final closure gate); once a migration has been applied it MUST NOT be edited — corrections MUST be delivered as a new migration
- [x] 2.4 Implement Nest `PrismaModule`/`PrismaService` in `apps/api` that owns connect/disconnect lifecycle and is registered in the application module graph
- [x] 2.5 Add committed `.env.example` documenting `DATABASE_URL` placeholders for native macOS at `localhost:5441` and noting Compose `api` uses hostname `postgres:5432`; ensure real `.env` files are gitignored; confirm no secrets are committed and SpecPilot credentials remain distinct from `axioma-db-dev`; capture the check in `evidence/secret-safety-check.txt`

## 3. API readiness and safe failure (US-001, `nestjs-fastify-api-baseline`)

- [x] 3.1 Keep `GET /health` liveness byte-stable as `{ "status": "ok", "service": "api" }` with no database dependency
- [x] 3.2 Implement `GET /health/ready` returning HTTP 200 with `{ "status": "ok", "service": "api", "database": "ok" }` on successful Prisma probe, and HTTP 503 with explicit non-ok database status on probe failure
- [x] 3.3 Fail startup non-zero (no HTTP serve) when `DATABASE_URL` is missing or malformed; when URL is well-formed but unreachable, keep serving liveness and report readiness 503; never fabricate readiness success
- [x] 3.4 Extend or update shared contracts only if required for the readiness payload; keep the liveness contract unchanged; record any contract changes in evidence

## 4. Docker Compose local runtime (US-001, `docker-compose-local-runtime`)

- [x] 4.1 Resolve and pin an official PostgreSQL image tag or digest (not `latest`); record it in `evidence/toolchain.md`
- [x] 4.2 Before any SpecPilot Compose up: capture a Docker coexistence pre-check in `evidence/docker-coexistence-pre.txt` proving (a) foreign container `axioma-db-dev` is intact and untouched by SpecPilot, (b) host port `5440` remains reserved for Axioma, (c) host port `5441` is available for SpecPilot, and (d) SpecPilot container name `specpilot-postgres`, exclusive Compose network, and exclusive volume name (e.g. `specpilot-postgres-data`) do not collide with existing Docker resources; if `5441` is occupied, stop and report without silently choosing another port
- [x] 4.3 Add root `compose.yaml` plus reproducible container builds for the SpecPilot-only local runtime, with all of the following explicit requirements: container/project naming uses `specpilot-postgres` (and SpecPilot-scoped Compose project) to avoid collisions; `postgres` uses the pinned official image (no `latest` without explicit pin), exclusive named volume (e.g. `specpilot-postgres-data`), exclusive Compose network, `pg_isready` healthcheck, host mapping **`5441:5432`**, and SpecPilot-only documented non-secret local credentials distinct from Axioma; a reproducible `Dockerfile` for `apps/api` on a Node 24-compatible base; a reproducible `Dockerfile` for `apps/web` that produces the Angular production build and serves it from an appropriate HTTP server; the `api` service depends on healthy SpecPilot `postgres`, receives `DATABASE_URL` pointing at Compose hostname `postgres` port `5432`, and runs `prisma migrate deploy` before starting NestJS; the `web` service exposes the compiled shell so it is reachable from the host; the Dockerfiles MUST NOT include local `node_modules`, real `.env` files, the local PrimeUI license file, or any other secret; appropriate `.dockerignore` coverage MUST exist; and no worker, CI, Redis, `axioma-db-dev`, or other out-of-slice/foreign service may be added or targeted
- [x] 4.4 Document copyable operator runbooks that use **only** SpecPilot Compose project resources for Compose up/down, SpecPilot-local volume reset (destructive/local-only; never `docker compose down --volumes` outside the SpecPilot project), and native macOS variant (SpecPilot Compose postgres + native api/web with `DATABASE_URL` at `localhost:5441`); forbid any command that stops, restarts, modifies, or deletes `axioma-db-dev` or foreign volumes/networks; use hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 4.5 After SpecPilot Compose operations used for evidence, capture `evidence/docker-coexistence-post.txt` proving `axioma-db-dev` was not modified or restarted by SpecPilot commands and that host port `5440` remains reserved for Axioma

## 5. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 5.1 Add unit tests (no Docker) for missing/malformed `DATABASE_URL` startup rejection and readiness failure mapping to HTTP 503 with explicit non-ok database status; capture outputs under `evidence/success/` and `evidence/failure/` as applicable
- [x] 5.2 Add Testcontainers PostgreSQL integration tests: start pinned-major ephemeral Postgres, apply committed migrations with `prisma migrate deploy`, execute `app_metadata` round trip, prove readiness success against the live container and readiness failure against unreachable DB; capture outputs under `evidence/success/` and `evidence/failure/`; Testcontainers MUST NOT use `axioma-db-dev` or SpecPilot Compose volumes as its target
- [x] 5.3 Re-run existing web, API liveness, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 5.4 Capture SpecPilot Compose runtime evidence for healthy `postgres`+`api`+`web` on SpecPilot resources only (liveness, readiness, web reachability) and one blocked path (e.g. stopped SpecPilot Postgres → readiness 503); store under `evidence/success/` and `evidence/failure/`; pair with the pre/post coexistence evidence from tasks 4.2 and 4.5
- [x] 5.5 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable, including no impact on foreign Docker resource `axioma-db-dev`) in `evidence/impact-statements.md`

## 6. Governance validators and inventory sync (US-002/US-003)

- [x] 6.1 Update `.gitignore` only as required for Prisma/Compose/env/build artifacts without weakening secret scanning
- [x] 6.2 Synchronize `docs/context/**` and regenerate `package-summary.json` for the persistence/runtime tree; capture integrity-consistent results in evidence
- [x] 6.3 Run existing baseline/governance validators (including secret scan) on the clean tree and capture passing output in `evidence/success/validators.txt`
- [x] 6.4 Confirm Prisma CLI/client versions and PostgreSQL image pin are recorded in evidence and locked where applicable; confirm no unqualified `latest` dependencies without lockfile/image pin resolution
- [x] 6.5 Confirm secret scan finds no committed `DATABASE_URL` secrets, real `.env` files, or credential leaks in tracked Compose/env/example files; capture in evidence

## 7. Operator-visible outcomes (US-003)

- [x] 7.1 Obtain and record operator confirmation that Compose (or documented native) Postgres + API/web path, liveness, readiness success, and readiness failure behave as documented in `evidence/human-validation.md`
- [x] 7.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 8. Closure gates (US-003)

- [x] 8.1 Report all validation and test results to the operator and obtain explicit approval before any commit, push, Verify, sync, or archive (main-only; no branches; no Pull Requests)
- [x] 8.2 With operator approval, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; if not exact `PASS`, stop and remediate
- [x] 8.3 With operator approval after Verify `PASS`, sync the four capability specs (two new + two deltas) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 8.4 After sync, run applicable integrity gates (`openspec validate --all`, package-summary, delivery-graph, secret scan, baseline) and capture results; stop immediately on any failure
- [x] 8.5 With operator approval, archive the change through the approved lifecycle and record archive evidence; confirm no active changes remain
- [x] 8.6 After archive, run the complete final validation set (openspec validate/list, web/api/shared-contracts builds and tests, npm/Nx checks, package-summary, delivery-graph, secret scan, baseline, branch `main`), confirm no license/secret leaks in tracked or staged content, report `git status` and `git diff` to the operator, and only with explicit operator approval create the final commit on `main` and push if requested
