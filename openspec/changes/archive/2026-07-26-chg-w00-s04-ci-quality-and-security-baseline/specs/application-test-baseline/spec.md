## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Quality gates invoke the established application test suites
The required quality-gate orchestrator (`scripts/run-quality-gates.sh`) and the post-push GitHub Actions workflow that invokes it MUST run the established application automated test suites via `nx run-many -t test` (or equivalent), including Testcontainers-backed persistence tests where already required. Persistence integration tests MUST NOT be marked CI-skipped. SpecPilot Docker Compose MUST NOT be used as the test database vehicle inside CI.

#### Scenario: Gate run executes application tests including Testcontainers paths
- **WHEN** the full quality-gate orchestrator runs on an environment with Docker available
- **THEN** the established web, API, shared-contracts, and Testcontainers persistence suites are executed as part of the automated test gate and are not skipped solely because the run is remote CI

#### Scenario: Compose is not used as the CI test database
- **WHEN** automated tests run under the quality-gate orchestrator in GitHub Actions
- **THEN** SpecPilot Compose project resources are not started as the CI database; ephemeral Testcontainers PostgreSQL remains the integration path where required
