# application-test-baseline

## Purpose

Deterministic automated tests for the monorepo application baseline covering success and meaningful failure paths, with evidence suitable for Verify.

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
Deterministic automated test outputs for the baseline MUST be captured under `openspec/changes/chg-w00-s02-nx-angular-nest-baseline/evidence/` (or the archived change evidence path after archive). This slice MUST NOT rely on Playwright e2e, Testcontainers, or CI workflow ownership for its required evidence.

#### Scenario: Evidence files are present for Verify
- **WHEN** baseline test evidence is prepared for Verify
- **THEN** reproducible command outputs exist under the change `evidence/` directory and do not depend on Playwright, Testcontainers, or CI workflows introduced by this slice
