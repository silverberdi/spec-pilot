## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w02-s01-context-source-resolution`, evidence MUST live under `openspec/changes/chg-w02-s01-context-source-resolution/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w02-s01-context-source-resolution`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Context-source resolution success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful context-source resolve path (HTTP 200 with sorted `paths` for a registered project with active configuration) and at least one meaningful empty or blocked/failure path. Coverage MUST include: empty match → HTTP 200 `pathCount` 0; missing configuration → HTTP 422 `configuration_not_found`; invalid/missing stage → HTTP 422 `invalid_review_stage`; unknown project → HTTP 404 `project_not_found`; out-of-tree symlink → HTTP 422 `context_path_escape` with no partial paths; in-tree symlink omitted; defensive mandatory exclude applied when snapshot omits one; invalid patterns (empty, NUL, absolute, backslash, `..`) → `invalid_context_patterns`; leading `!` not treated as negation; case-sensitive matching; `.git` omitted but counted; visit/match/UTF-8 payload limits → `context_resolution_limit_exceeded` without truncation; timeout → `context_resolution_timeout` where practical; `EACCES`/`EPERM` → `context_entry_unreadable` where practical; unexpected failure → HTTP 500 `context_resolve_failed` without path leakage where practical; shared-contracts acceptance/rejection for resolve DTOs and unknown codes; and web idle/loading/success/empty/blocked outcomes including the 200-path display cap copy when `pathCount > 200`. Existing registration, configuration, discovery, dashboard, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Resolve success path is demonstrated
- **WHEN** automated API or integration tests resolve context sources for a registered temp repository with attached configuration and matching files
- **THEN** the tests pass by demonstrating HTTP 200 with `status` `ok` and sorted repository-relative `paths`

#### Scenario: Empty resolve success is demonstrated
- **WHEN** automated tests resolve against a tree that matches no include/exclude candidates
- **THEN** the tests pass by demonstrating HTTP 200 with `pathCount` 0

#### Scenario: Missing configuration is blocked
- **WHEN** automated tests resolve for a registered project without an active configuration version
- **THEN** the tests pass by demonstrating HTTP 422 with `code` `configuration_not_found`

#### Scenario: Out-of-tree symlink is blocked without partial results
- **WHEN** automated tests resolve a fixture containing a symlink that escapes the repository root
- **THEN** the tests pass by demonstrating HTTP 422 with `code` `context_path_escape` and no success path list

#### Scenario: Mandatory exclude is applied when snapshot omits it
- **WHEN** automated tests resolve using a snapshot whose persisted excludes omit a mandatory secret-path pattern
- **THEN** the matching secret-bearing path is not a candidate and the success `exclude` array includes the effective mandatory pattern

#### Scenario: Shared resolve unions are covered
- **WHEN** shared-contracts tests validate ok, blocked, unknown-code, unknown-stage, and ambiguous resolve payloads
- **THEN** valid payloads are accepted and unknown codes, unknown stages, or ambiguous unions are rejected

#### Scenario: Web resolve outcomes are covered
- **WHEN** web tests exercise the resolve surface with mocked idle, loading, success, empty, blocked/error, and `pathCount > 200` responses
- **THEN** idle, loading, success, empty, blocked/error, and the 200-path display-cap copy are demonstrated
