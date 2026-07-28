## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w01-s04-project-dashboard`, evidence MUST live under `openspec/changes/chg-w01-s04-project-dashboard/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w01-s04-project-dashboard`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Project dashboard listing and discovery-health paths are covered by automated tests
Automated tests MUST demonstrate dashboard-oriented listing and discovery-health success plus at least one meaningful empty, never-inspected, blocked, or invalid path. Coverage MUST include: `deriveDiscoveryHealth` matrix cases (both-null `never_inspected`; exactly-one-null `invalid`; type-guard failure; projectId mismatch; inspectedAt instant mismatch; both-ok `ok`; git-only / openspec-only / both blocked); closed `summaryMessage` mapper strings without copying persisted subsystem messages; `POST /projects` 201 embedding `discoveryHealth` `never_inspected`; `GET /projects` empty array; multi-project `GET /projects` ordered by `registeredAt` DESC then `id` ASC; list rows after discovery refresh showing derived `ok` or `blocked`; shared-contracts acceptance/rejection for enriched `ProjectDto` / `discoveryHealth`; and web empty, loading, populated health labels, order preservation, and at least one blocked or never_inspected presentation. Existing registration, configuration, discovery, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Health derivation matrix is covered
- **WHEN** unit tests exercise `deriveDiscoveryHealth` across the fail-closed matrix
- **THEN** never_inspected, invalid, ok, and blocked outcomes match the binding derivation rules

#### Scenario: Summary message mapper is covered
- **WHEN** unit tests map closed Git and OpenSpec blocked codes into `summaryMessage`
- **THEN** the exact Spanish mapper strings are produced and persisted free-text subsystem messages are not copied

#### Scenario: List ordering is covered with multiple projects
- **WHEN** automated API or integration tests register multiple projects and call `GET /projects`
- **THEN** the tests pass by demonstrating order `registeredAt` DESC with `id` ASC as tie-breaker

#### Scenario: Register embeds never_inspected discoveryHealth
- **WHEN** automated tests register a project successfully
- **THEN** the HTTP 201 `ProjectDto` includes `discoveryHealth.status` `never_inspected`

#### Scenario: Web dashboard outcomes are covered
- **WHEN** web tests exercise the dashboard list with mocked empty, loading, populated, blocked or never_inspected, and error responses
- **THEN** empty, loading, populated health, order preservation, and error outcomes are demonstrated
