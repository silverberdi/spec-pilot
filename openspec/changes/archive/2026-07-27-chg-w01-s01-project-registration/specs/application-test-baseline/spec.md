## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w01-s01-project-registration`, evidence MUST live under `openspec/changes/chg-w01-s01-project-registration/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w01-s01-project-registration`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Local project registration success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful local project registration path (HTTP 201 with persisted canonical `repositoryPath`) and at least one meaningful blocked or failure path (HTTP 422 or 409 with stable `{ code, message }` and no partial insert). Coverage MUST include realpath/symlink duplicate identity where practical, `displayName` max-length rejection, and deterministic mapping of unique-constraint violations to HTTP 409. Web tests MUST cover empty, loading, success, and blocked/error registration UI states against the API contracts. Existing health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Registration success path is demonstrated
- **WHEN** automated API or integration tests register an eligible temp repository containing `.specpilot/project.yaml`
- **THEN** the tests pass by demonstrating HTTP 201, a persisted Project whose `repositoryPath` is the canonical realpath, and no modification of the fixture repository contents beyond pre-existing files

#### Scenario: Registration blocked path is demonstrated
- **WHEN** automated tests exercise a blocked eligibility case such as missing `project.yaml` or overlong `displayName`
- **THEN** the tests pass by demonstrating HTTP 422 with the expected `code`, stable `{ code, message }` body, and no Project row inserted

#### Scenario: Unique constraint race maps to 409
- **WHEN** automated tests force or simulate a Prisma unique-constraint violation on `repositoryPath` or `slug`
- **THEN** the tests pass by demonstrating HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug` as appropriate

#### Scenario: Web registration states are covered
- **WHEN** web tests exercise the registration surface with mocked empty list, in-flight request, 201 success, and 422/409 error responses
- **THEN** empty, loading, success, and blocked/error outcomes are demonstrated
