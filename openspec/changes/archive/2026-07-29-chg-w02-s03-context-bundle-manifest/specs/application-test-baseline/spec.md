## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w02-s03-context-bundle-manifest`, evidence MUST live under `openspec/changes/chg-w02-s03-context-bundle-manifest/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w02-s03-context-bundle-manifest`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Context-bundle success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful context-bundle create path (HTTP 201 with persisted immutable manifest including content hashes, full-file line ranges, token estimates, and algorithm ids for a registered project with active configuration) and at least one meaningful blocked or failure path. Coverage MUST include: empty candidates → HTTP 201 empty bundle; oversize + clean → HTTP 201 with oversize in `exclusions` as `unscannable_content` and clean path in `entries`; sole oversize candidate → HTTP 422 `unsafe_context_bundle` with counts only and no row; total-byte overflow → propagated `secret_scan_limit_exceeded` with no row; shared-pipeline timeout → propagated `secret_scan_timeout` with no row; injected hash/token/canonicalization/`manifestHash` failure → HTTP 500 `context_bundle_failed` with no row; Prisma transaction failure → HTTP 500 `context_bundle_failed` with no partial row; same-bytes single-open spies proving detectors/hash/line/token consume the same byte object and no reread after a mutation opportunity; `manifestHash` stability and sensitivity matrix (identical material, changed exclusion, changed estimator/policy id, entry order, id/createdAt excluded); type guards rejecting removed `context_bundle_*` blocked codes and enforcing conditional unsafe counts; GET by id and latest `limit=1`; invalid latest query → `invalid_context_bundle_query`; public secret-scan regression remains green; and web idle/loading/success/empty/blocked outcomes without file contents or transmission flags. Existing registration, configuration, discovery, dashboard, resolve, secret-scan, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Clean context-bundle success path is demonstrated
- **WHEN** automated API or integration tests create a context bundle for a registered temp repository with attached configuration and clean included files
- **THEN** the tests pass by demonstrating HTTP 201 with persisted entries containing `contentHash`, line ranges, token estimates, and algorithm ids

#### Scenario: Oversize mixed with clean persists exclusions and entries
- **WHEN** automated tests include one oversize candidate and one clean candidate
- **THEN** the tests pass by demonstrating HTTP 201 with the oversize path excluded as `unscannable_content` and the clean path present in `entries`

#### Scenario: Sole oversize candidate blocks without a row
- **WHEN** automated tests create a bundle whose only candidate is oversize
- **THEN** the tests pass by demonstrating HTTP 422 `unsafe_context_bundle` with required safe counts and zero `ContextBundle` rows

#### Scenario: Same-bytes single-open invariant is demonstrated
- **WHEN** automated unit or integration tests spy filesystem open/read during bundle create and mutate the repository file after the first read
- **THEN** the tests pass by demonstrating a single open/read for the clean path, same byte object consumption across detect/hash/line/token, and no second read of the mutated path

#### Scenario: Construction and Prisma failures map to context_bundle_failed
- **WHEN** automated tests inject hash/token/canonicalization failure or Prisma insert failure during create
- **THEN** the tests pass by demonstrating HTTP 500 `context_bundle_failed` with no persisted or partial row

#### Scenario: Shared context-bundle unions are covered
- **WHEN** shared-contracts tests validate ok bundles, unsafe-with-counts, non-unsafe-without-counts, removed blocked codes, and ambiguous context-bundle payloads
- **THEN** valid payloads are accepted and invalid conditional fields, removed codes, or forbidden body fields are rejected

#### Scenario: Web context-bundle outcomes are covered
- **WHEN** web tests exercise the context-bundle surface with mocked idle, loading, success, empty, unsafe blocked, and error responses
- **THEN** idle, loading, success, empty, unsafe counts-only, and blocked/error outcomes are demonstrated without rendering file contents or transmission flags
