## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test and runtime outputs for this slice MUST be captured under `openspec/changes/chg-w00-s03-postgresql-prisma-and-local-runtime/evidence/` (or the archived change evidence path after archive). Persistence integration evidence MUST use Testcontainers PostgreSQL where required by the scenarios below. This slice MUST NOT rely on Playwright product e2e or CI workflow ownership for its required evidence.

#### Scenario: Evidence files are present for Verify
- **WHEN** persistence and runtime test evidence is prepared for Verify
- **THEN** reproducible command outputs exist under the change `evidence/` directory and do not depend on Playwright product e2e or CI workflows introduced by this slice

#### Scenario: Testcontainers evidence is permitted for persistence
- **WHEN** API persistence integration evidence is captured
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the change `evidence/` directory

## ADDED Requirements

### Requirement: Persistence configuration failure is covered by automated tests
Automated tests MUST demonstrate that missing or malformed `DATABASE_URL` configuration causes startup rejection, and that readiness probe failure maps to HTTP 503 with an explicit non-ok database status. These configuration and mapping tests MUST NOT require a live Docker daemon.

#### Scenario: Missing or malformed DATABASE_URL is rejected
- **WHEN** automated tests exercise API startup with missing or malformed `DATABASE_URL`
- **THEN** the tests pass by demonstrating startup rejection without serving HTTP traffic

#### Scenario: Readiness failure mapping is demonstrated without Docker
- **WHEN** automated tests exercise readiness handling with a failed database probe
- **THEN** the tests pass by demonstrating HTTP 503 with an explicit non-ok database status

### Requirement: Testcontainers PostgreSQL covers migration and readiness paths
Automated API persistence integration tests MUST start an ephemeral PostgreSQL container via Testcontainers using a pinned PostgreSQL major compatible with the Compose baseline, apply committed migrations with `prisma migrate deploy`, execute a successful baseline metadata round trip through the Prisma client, demonstrate readiness success against the live container, and demonstrate readiness failure against an unreachable database. Existing `w00-s02` web, API liveness, and shared-contracts test suites MUST continue to pass.

#### Scenario: Migrations and metadata round trip succeed in Testcontainers
- **WHEN** persistence integration tests start Testcontainers PostgreSQL and apply committed migrations
- **THEN** `prisma migrate deploy` succeeds and a baseline metadata insert-and-read round trip succeeds through the Prisma client

#### Scenario: Readiness success and failure are demonstrated against real Postgres
- **WHEN** persistence integration tests probe readiness against a live Testcontainers database and against an unreachable database URL or stopped container
- **THEN** readiness returns the success contract for the live database and HTTP 503 with explicit non-ok database status for the unreachable case

#### Scenario: Prior baseline suites remain green
- **WHEN** the full required automated test set for this slice is executed
- **THEN** existing web shell, API liveness, and shared-contracts suites continue to pass

### Requirement: Compose runtime evidence covers success and blocked paths
Deterministic runtime evidence MUST capture Compose startup for `postgres`, `api`, and `web`, successful `GET /health` and `GET /health/ready` responses, host reachability of the web service, and at least one blocked path such as readiness returning HTTP 503 after Postgres becomes unavailable.

#### Scenario: Compose success path is evidenced
- **WHEN** Compose runtime evidence is captured for a healthy stack
- **THEN** outputs show `postgres`, `api`, and `web` started, liveness and readiness succeeding, and the web service reachable from the host

#### Scenario: Compose blocked readiness path is evidenced
- **WHEN** Compose runtime evidence captures a blocked database condition
- **THEN** outputs show readiness returning HTTP 503 with an explicit non-ok database status while the failure remains operator-visible
