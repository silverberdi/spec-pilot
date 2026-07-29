## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w02-s04-context-preview-and-approval`, evidence MUST live under `openspec/changes/chg-w02-s04-context-preview-and-approval/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w02-s04-context-preview-and-approval`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: Disclosure preview and approval success and blocked paths are covered by automated tests
Automated tests MUST demonstrate a successful disclosure path (create bundle → preview creates metadata-only session with ephemeral excerpts → status `approvalRequired` true → approve with `previewSessionId` → status `approvalRequired` false → latest approval with `contentTransmitted` false and both policy ids) and the blocked/failure matrix required by `context-preview-and-approval`. Coverage MUST include: approval without `previewSessionId` → `disclosure_preview_required` and no approval row; expired preview → `disclosure_preview_expired` and no approval row; session for another bundle/project → binding/required rejection and no approval row; changed `previewPolicyId` → `disclosure_preview_policy_mismatch`; mutate file after preview before approve → `disclosure_preview_integrity_mismatch` and no approval row; unchanged file → approval succeeds; coverage invalidation when `previewPolicyId` or `approvalPolicyId` changes; full-file excerpt preserves original CRLF/text exactly; multiple-range canonical extraction; invalid persisted ranges block with no session; `previewIntegrityHash` stable for identical material and changes when excerpt changes; preview session stores no excerpt/body/raw bytes; failed preview creates no session; failed approval creates no approval row; `ContextBundle` remains immutable and free of `contentTransmitted`; type guards require approval `contentTransmitted === false` and reject it on bundle/preview DTOs; and web idle/loading/success/empty/blocked outcomes for preview and approval with Spanish copy, both policy ids, and the 20-entry display cap. Existing registration, configuration, discovery, dashboard, resolve, secret-scan, context-bundle, health/readiness, `AppMetadata`, web shell, and shared-contracts suites MUST continue to pass.

#### Scenario: Preview then approve success path is demonstrated
- **WHEN** automated API or integration tests preview and approve a valid bundle with unchanged live files
- **THEN** the tests pass by demonstrating HTTP 200 preview with a persisted metadata-only session, HTTP 201 approval with both policy ids and `contentTransmitted` false, and no mutation of the `ContextBundle` row

#### Scenario: Approval without preview is rejected
- **WHEN** automated tests approve without a valid `previewSessionId`
- **THEN** the tests pass by demonstrating HTTP 422 `disclosure_preview_required` and zero approval rows

#### Scenario: Expired preview and post-preview mutation are rejected
- **WHEN** automated tests approve an expired session or mutate a file after preview before approve
- **THEN** the tests pass by demonstrating the corresponding expired or integrity mismatch code and zero approval rows

#### Scenario: Canonical extraction and integrity hash matrix is demonstrated
- **WHEN** automated unit or integration tests exercise full-file CRLF preservation, multi-range concatenation, invalid ranges, and hash stability/sensitivity
- **THEN** the tests pass by demonstrating exact excerpt rules, blocked invalid ranges without sessions, stable hashes for identical material, and changed hashes when excerpts change

#### Scenario: Preview session persistence excludes bodies
- **WHEN** automated tests inspect a successful preview-session database row
- **THEN** the tests pass by demonstrating absence of excerpts, file bodies, decoded text, and raw bytes in persisted columns

#### Scenario: Shared disclosure contracts are covered
- **WHEN** shared-contracts tests validate preview ok, approval ok with `contentTransmitted` false, approval request requiring `previewSessionId`, and rejection of `contentTransmitted` true or bundle transmission flags
- **THEN** valid payloads are accepted and invalid shapes are rejected

#### Scenario: Web disclosure outcomes are covered
- **WHEN** web tests exercise the disclosure surface with mocked idle, loading, success, empty, blocked, and error responses
- **THEN** idle, loading, success, empty, and blocked/error outcomes are demonstrated with both policy ids visible and without DeepSeek send controls
