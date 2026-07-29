## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w02-s02-secret-detection-and-exclusion`, evidence MUST live under `openspec/changes/chg-w02-s02-secret-detection-and-exclusion/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w02-s02-secret-detection-and-exclusion`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Secret detection success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful secret-scan path (HTTP 200 with clean eligible paths for a registered project with active configuration) and at least one meaningful blocked or failure path. Coverage MUST include: empty candidates → HTTP 200 with `candidatePathCount` 0; planted closed-pattern secret in an included file → either HTTP 200 with path excluded from `eligiblePaths` or HTTP 422 `unsafe_context_bundle` when no eligible paths remain; `unsafe_context_bundle` body requiring only safe counts; oversize/`fstat` unscannable without counting toward `totalBytesRead`; NUL and invalid UTF-8 unscannable; pre-read total-byte overflow → `secret_scan_limit_exceeded`; timeout → `secret_scan_timeout` where practical; invalid relative path → `context_path_escape`; symlink/`EACCES` mid-scan → `secret_scan_entry_unreadable` with no partial ok; detector dedupe and ordering; finding payloads without match text; shared-contracts acceptance/rejection including conditional unsafe counts and rejection of snippet fields; unexpected failure → HTTP 500 `secret_scan_failed` without content leakage where practical; and web idle/loading/success/empty/blocked outcomes including unsafe counts-only presentation. Product fixtures with secret-like content MUST use temporary directories or change `evidence/` quarantine paths and MUST NOT weaken SpecPilot repository CI secret scanning. Existing registration, configuration, discovery, dashboard, resolve, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Clean secret-scan success path is demonstrated
- **WHEN** automated API or integration tests secret-scan a registered temp repository with attached configuration and clean included files
- **THEN** the tests pass by demonstrating HTTP 200 with `status` `ok` and `eligiblePaths` equal to resolve candidates

#### Scenario: Detected secret excludes or blocks unsafely
- **WHEN** automated tests plant a closed-pattern secret in an included candidate file and run secret scan
- **THEN** the tests pass by demonstrating either HTTP 200 with that path absent from `eligiblePaths` and a deduplicated finding without match text, or HTTP 422 `unsafe_context_bundle` with required safe counts when no eligible paths remain

#### Scenario: Oversize unscannable does not inflate totalBytesRead
- **WHEN** automated unit or integration tests classify a file with `fstat` size greater than 1048576
- **THEN** the tests pass by demonstrating `unscannable_content` exclusion without reading contents and without counting that file toward the total-byte read budget used for `secret_scan_limit_exceeded`

#### Scenario: Shared secret-scan unions are covered
- **WHEN** shared-contracts tests validate ok, unsafe-with-counts, non-unsafe-without-counts, unknown-code, snippet-bearing finding, and ambiguous secret-scan payloads
- **THEN** valid payloads are accepted and invalid conditional fields, unknown codes, or forbidden finding fields are rejected

#### Scenario: Web secret-scan outcomes are covered
- **WHEN** web tests exercise the secret-scan surface with mocked idle, loading, success, empty, success-with-exclusions, unsafe blocked, and error responses
- **THEN** idle, loading, success, empty, exclusions, unsafe counts-only, and blocked/error outcomes are demonstrated without rendering file contents or secret values

#### Scenario: Repository CI scanner remains unweakened by fixtures
- **WHEN** product secret-scan fixtures are introduced for automated tests
- **THEN** fixtures are confined to temp dirs or quarantined evidence paths and SpecPilot repository secret scanning is not weakened to pass induced tracked fixtures
