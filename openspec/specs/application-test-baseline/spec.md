# application-test-baseline

## Purpose

Deterministic automated tests for the monorepo application baseline covering success and meaningful failure paths, including persistence and Compose runtime evidence suitable for Verify.

## Requirements

### Requirement: One consistent Nx-supported test runner
The monorepo baseline MUST select a single test runner supported by the chosen Nx 23 generators/plugins, record that choice in change evidence, and use it consistently for `apps/web`, `apps/api`, and `packages/shared-contracts` whenever the relevant plugin supports it. Jest and Vitest MUST NOT be mixed without a documented technical incompatibility and recorded rationale.

#### Scenario: Runner choice is recorded and applied
- **WHEN** baseline tests are executed for evidence
- **THEN** the selected runner is recorded in change evidence and used consistently across supported web, API, and shared-contracts projects

#### Scenario: Mixed runners without necessity are prohibited
- **WHEN** no documented plugin incompatibility requires a second runner
- **THEN** the baseline MUST NOT introduce both Jest and Vitest

### Requirement: Shared contracts tests cover success and failure
Automated tests for `packages/shared-contracts` MUST cover a successful health-contract validation path and at least one invalid or blocked payload path.

#### Scenario: Shared validator success path
- **WHEN** shared-contracts tests run against a valid health payload
- **THEN** the tests pass and demonstrate successful validation

#### Scenario: Shared validator failure path
- **WHEN** shared-contracts tests run against an invalid health payload
- **THEN** the tests pass by demonstrating that validation rejects the payload

### Requirement: API health tests cover success without a real port
Automated API tests MUST demonstrate that `GET /health` returns the exact success contract. HTTP tests MAY use the Fastify adapter `inject` mechanism and MUST NOT require binding a real network port for baseline evidence.

#### Scenario: Health success via Fastify inject
- **WHEN** API baseline tests invoke `GET /health` through Fastify `inject` or an equivalent in-process adapter mechanism
- **THEN** the response body is exactly `{ "status": "ok", "service": "api" }` and no real listening port is required for the evidence run

### Requirement: Web shell tests cover success and failure
Automated web tests MUST demonstrate that the baseline shell renders on the success path and surfaces an explicit error or blocked path when bootstrap input or configuration is invalid.

#### Scenario: Web shell success path
- **WHEN** web baseline unit or component tests exercise successful shell bootstrap
- **THEN** the shell success render path is demonstrated

#### Scenario: Web shell failure path
- **WHEN** web baseline tests exercise invalid bootstrap input or failed configuration
- **THEN** an explicit error or blocked path is demonstrated

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w00-s04-ci-quality-and-security-baseline`, evidence MUST live under `openspec/changes/chg-w00-s04-ci-quality-and-security-baseline/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. The `w00-s03` rule that required evidence must not rely on CI workflow ownership is superseded for `w00-s04` as follows: mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w00-s04-ci-quality-and-security-baseline`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

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

### Requirement: Quality gates invoke the established application test suites
The required quality-gate orchestrator (`scripts/run-quality-gates.sh`) and the post-push GitHub Actions workflow that invokes it MUST run the established application automated test suites via `nx run-many -t test` (or equivalent), including Testcontainers-backed persistence tests where already required. Persistence integration tests MUST NOT be marked CI-skipped. SpecPilot Docker Compose MUST NOT be used as the test database vehicle inside CI.

#### Scenario: Gate run executes application tests including Testcontainers paths
- **WHEN** the full quality-gate orchestrator runs on an environment with Docker available
- **THEN** the established web, API, shared-contracts, and Testcontainers persistence suites are executed as part of the automated test gate and are not skipped solely because the run is remote CI

#### Scenario: Compose is not used as the CI test database
- **WHEN** automated tests run under the quality-gate orchestrator in GitHub Actions
- **THEN** SpecPilot Compose project resources are not started as the CI database; ephemeral Testcontainers PostgreSQL remains the integration path where required
