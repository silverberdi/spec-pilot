## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w01-s02-project-configuration`, evidence MUST live under `openspec/changes/chg-w01-s02-project-configuration/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w01-s02-project-configuration`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Project YAML configuration success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful project.yaml parse/validate/persist path (HTTP 201 register with `configuration.status` `attached`, or HTTP 200 refresh) that creates an immutable `ProjectConfigurationVersion` and sets `configurationVersionId`, and at least one meaningful blocked or failure path. Coverage MUST include `project_yaml_too_large` (>262144 bytes) before parse, exact-byte `sourceHash` behavior (no pre-hash normalization), same-hash idempotency, fail-closed pointer retention on validation failure, register attach blocked outcomes that keep the `Project`, refresh expected HTTP 422 codes, and refresh unexpected HTTP 500 `configuration_refresh_failed` where practical. Shared-contracts tests MUST cover the `RegisterProjectResponse` discriminated union. Web tests MUST cover attach/refresh empty, loading, success, and blocked/error states. Existing registration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Configuration attach success path is demonstrated
- **WHEN** automated API or integration tests register an eligible temp repository containing a schema-valid `.specpilot/project.yaml` within size limits
- **THEN** the tests pass by demonstrating HTTP 201 with `configuration.status` `attached`, a persisted version row, and `configurationVersionId` equal to `version.id`

#### Scenario: Oversized YAML blocked path is demonstrated
- **WHEN** automated tests exercise configuration attach or refresh against a `.specpilot/project.yaml` larger than 262144 bytes
- **THEN** the tests pass by demonstrating the `project_yaml_too_large` outcome, no version row insert, and no `configurationVersionId` move

#### Scenario: Register attach blocked keeps the project
- **WHEN** automated tests register an eligible repository whose YAML fails parse or schema validation
- **THEN** the tests pass by demonstrating HTTP 201 with `configuration.status` `blocked`, `configurationVersionId` null, a retained Project row, and no configuration version row

#### Scenario: Refresh expected and unexpected failures are covered
- **WHEN** automated tests exercise refresh against an expected validation failure and, where practical, an unexpected infrastructure failure
- **THEN** the tests pass by demonstrating HTTP 422 with a specific code for the expected path and HTTP 500 with `configuration_refresh_failed` for the unexpected path

#### Scenario: Shared RegisterProjectResponse union is covered
- **WHEN** shared-contracts tests validate attached, blocked, and ambiguous `RegisterProjectResponse` payloads
- **THEN** valid attached/blocked payloads are accepted and incomplete or ambiguous unions are rejected

#### Scenario: Web configuration outcomes are covered
- **WHEN** web tests exercise register attach and refresh surfaces with mocked attached, blocked, loading, and error responses
- **THEN** empty, loading, success, and blocked/error configuration outcomes are demonstrated
