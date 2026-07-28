## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w01-s03-git-and-openspec-discovery`, evidence MUST live under `openspec/changes/chg-w01-s03-git-and-openspec-discovery/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w01-s03-git-and-openspec-discovery`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Git and OpenSpec discovery success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful discovery refresh path (HTTP 200 with persisted `lastDiscovery` and non-null `lastInspectedAt`) and at least one meaningful blocked or failure path. Coverage MUST include non-git repository → Git `not_a_git_repository` with HTTP 200 persist; OpenSpec `openspec_root_missing` or limit/escape blocked outcomes with HTTP 200 persist where practical; hard path HTTP 422 without field updates; `GET` before refresh → HTTP 404 `discovery_not_found`; unexpected refresh failure → HTTP 500 `discovery_refresh_failed` where practical; registration still returning `lastInspectedAt: null`; closed discovery code unions and ambiguous shape rejection in shared-contracts; and web empty/loading/success/blocked discovery outcomes. Existing registration, configuration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Discovery refresh success path is demonstrated
- **WHEN** automated API or integration tests refresh discovery for a registered temp repository with a usable Git work tree and OpenSpec layout
- **THEN** the tests pass by demonstrating HTTP 200, persisted `lastDiscovery`, and non-null `lastInspectedAt`

#### Scenario: Non-git blocked Git outcome still persists
- **WHEN** automated tests refresh discovery against a readable registered directory that is not a Git work tree
- **THEN** the tests pass by demonstrating HTTP 200 with Git blocked `not_a_git_repository` and persisted snapshot fields

#### Scenario: Hard path failure does not update discovery fields
- **WHEN** automated tests refresh discovery after the stored repository path becomes missing or unreadable
- **THEN** the tests pass by demonstrating HTTP 422 with a repository code and unchanged `lastDiscovery` / `lastInspectedAt`

#### Scenario: Get before refresh returns discovery_not_found
- **WHEN** automated tests call `GET /projects/:id/discovery` before any refresh
- **THEN** the tests pass by demonstrating HTTP 404 with `code` `discovery_not_found`

#### Scenario: Shared discovery unions are covered
- **WHEN** shared-contracts tests validate ok, blocked, unknown-code, and ambiguous `ProjectDiscoveryDto` payloads
- **THEN** valid payloads are accepted and unknown codes or ambiguous unions are rejected

#### Scenario: Web discovery outcomes are covered
- **WHEN** web tests exercise discovery refresh/get surfaces with mocked empty, loading, success, and blocked/error responses
- **THEN** empty, loading, success, and blocked/error discovery outcomes are demonstrated
