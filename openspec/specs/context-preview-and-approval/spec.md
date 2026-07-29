# context-preview-and-approval

## Purpose

Operator preview of bounded context-bundle excerpts and explicit disclosure approval with metadata-only session persistence, integrity re-checks, and versioned policy coverage—without mutating bundles or transmitting content to external providers.

## Requirements

### Requirement: Preview creates a metadata-only session after full integrity validation
The system SHALL expose `POST /projects/:id/context-bundles/:bundleId/preview` with body `{}` or absent and MUST NOT accept client-supplied paths, excerpts, ranges, hashes, or file bodies. Preview MUST load the immutable `ContextBundle` by `{ id: bundleId, projectId }`, verify each entry's live file bytes against its `contentHash`, construct canonical bounded excerpts, compute `previewIntegrityHash`, and only then insert one append-only `ContextDisclosurePreviewSession` row. Failed or partial preview MUST create no session and MUST NOT return a partial ok body. Successful responses MUST include `previewSessionId`, `previewPolicyId` exactly `bounded-selected-text-v1`, `approvalPolicyId` exactly `explicit-disclosure-approval-v1`, `previewIntegrityHash`, `createdAt`, `expiresAt` exactly fifteen minutes after `createdAt`, and ephemeral `items` with excerpts. Sessions MUST persist only metadata (`id`, `projectId`, `contextBundleId`, stage and identity fields copied from the bundle, `previewPolicyId`, `previewIntegrityHash`, `itemCount`, `previewedCodePointCount`, `createdAt`, `expiresAt`) and MUST NOT persist excerpts, file bodies, decoded text, raw bytes, secret values, or absolute host paths. There MUST be no product update or delete endpoint for preview sessions. Empty bundles (`entryCount` 0) MUST still create a session with empty `items`.

#### Scenario: Successful preview persists a session and returns ephemeral excerpts
- **WHEN** an operator previews a registered project's existing bundle whose live files still match every entry `contentHash`
- **THEN** the system returns HTTP 200 with `status` `ok`, a new `previewSessionId`, `previewPolicyId` `bounded-selected-text-v1`, `expiresAt` fifteen minutes after `createdAt`, ephemeral excerpts, and exactly one new preview-session row without stored excerpts

#### Scenario: Failed preview creates no session
- **WHEN** preview fails because a live file hash mismatches, a path is unreadable, bounds are exceeded, or construction fails
- **THEN** no `ContextDisclosurePreviewSession` row is created and the response is not a partial ok preview

#### Scenario: Empty bundle preview creates an empty session
- **WHEN** the target bundle has `entryCount` 0
- **THEN** the system returns HTTP 200 with empty `items`, persists a metadata-only session, and does not treat the outcome as blocked

#### Scenario: Client-supplied excerpts or paths are not accepted
- **WHEN** a preview request includes client paths, excerpts, ranges, content hashes, or file bodies
- **THEN** the system MUST NOT use those fields as preview input

### Requirement: Apply canonical excerpt extraction and previewIntegrityHash
Preview extraction MUST decode verified bytes with fatal UTF-8 and MUST NOT normalize CRLF to LF. `text.split('\n')` MUST be used only to map 1-based line ranges. For a full-file single range covering lines `1..lineCount` on a non-empty file, `excerpt` MUST equal the complete decoded text exactly, including existing newline and carriage-return characters. Empty files MUST yield `excerpt` `''`. For multiple valid ranges, the system MUST validate ascending non-overlapping in-bounds ranges, extract each segment, and concatenate segments in range order using exactly one `'\n'` between non-contiguous ranges with no separator before the first or after the last segment. Invalid, overlapping, reversed, or out-of-bounds persisted ranges MUST return HTTP 422 `disclosure_preview_integrity_mismatch` with no partial response and no session. `previewIntegrityHash` MUST be lowercase SHA-256 over compact canonical JSON with keys in order `previewPolicyId`, `projectId`, `contextBundleId`, `manifestHash`, `items`; each item keys `path`, `contentHash`, `lineRanges`, `excerptHash`; each line-range keys `startLine`, `endLine`; `excerptHash` MUST be SHA-256 lowercase hex of the exact UTF-8 bytes of the ephemeral excerpt; `createdAt`, `expiresAt`, and `previewSessionId` MUST be excluded. Identical live content and policy MUST yield a stable `previewIntegrityHash`.

#### Scenario: Full-file excerpt preserves CRLF exactly
- **WHEN** a clean entry's live bytes decode to text containing carriage returns and a single full-file line range
- **THEN** the returned `excerpt` equals that decoded text exactly and the session's `previewIntegrityHash` digests that excerpt via `excerptHash`

#### Scenario: Invalid persisted ranges block without a session
- **WHEN** a bundle entry's persisted ranges are overlapping, reversed, or out of bounds for the decoded line count
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_integrity_mismatch` and no preview session is created

#### Scenario: previewIntegrityHash is stable for identical material
- **WHEN** preview is run twice against unchanged live files and the same preview policy for the same bundle
- **THEN** both successes share the same `previewIntegrityHash`

#### Scenario: Changed excerpt changes previewIntegrityHash
- **WHEN** live file content changes so the canonical excerpt differs while a prior session hash is compared
- **THEN** a newly computed `previewIntegrityHash` differs from the prior session hash

### Requirement: Enforce preview bounds without silent truncation
Preview and approval integrity re-checks MUST fail closed when any live `fileSize` exceeds `1048576` bytes (`disclosure_preview_entry_unreadable`), total bytes read exceed `52428800` (`disclosure_preview_limit_exceeded`), wall time exceeds `30000` ms (`disclosure_preview_timeout`), total excerpt Unicode code points exceed `200000`, or any single excerpt exceeds `50000` code points (`disclosure_preview_limit_exceeded`). Truncation of excerpts MUST NOT occur.

#### Scenario: Excerpt code-point overflow blocks without a session
- **WHEN** constructing the complete preview would exceed the total or per-entry excerpt code-point bound
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_limit_exceeded` and no preview session is created

### Requirement: Require preview session binding for disclosure approval
The system SHALL expose `POST /projects/:id/context-bundles/:bundleId/disclosure-approvals` with request body exactly `{ previewSessionId: string; manifestHash: string; decision: 'approved' }`. Approval MUST load the bundle by project and bundle id, load the preview session by `{ id: previewSessionId, projectId, contextBundleId: bundleId }`, require the session not expired, require `session.previewPolicyId` equal to current `bounded-selected-text-v1`, require session identity fields to match the bundle, require `session.manifestHash = body.manifestHash = bundle.manifestHash`, perform a mandatory full integrity re-check that recomputes canonical excerpts and `previewIntegrityHash`, require the recomputed hash equal `session.previewIntegrityHash`, and only then insert one append-only `ContextDisclosureApproval` row. Integrity re-check is mandatory—not optional. Any failed check MUST create no approval row. Approvals MUST persist `previewSessionId` as a foreign key to the preview session, `previewPolicyId`, `approvalPolicyId` exactly `explicit-disclosure-approval-v1`, `previewIntegrityHash`, `decision` `approved`, and `contentTransmitted` as a literal `false` snapshot that never changes. Multiple approval rows per preview session are allowed; there MUST be no unique constraint and no idempotent upsert. Approvals and preview sessions MUST NOT mutate `ContextBundle` rows. Approval means disclosure-ready, not transmitted; Wave 3 MUST use a separate transmission event rather than updating approval rows. `contentTransmitted` MUST remain forbidden on `ContextBundle` and preview-session DTOs.

#### Scenario: Approval without previewSessionId is rejected
- **WHEN** an approve request omits `previewSessionId` or supplies an unknown session for the project and bundle
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_required` and no approval row is created

#### Scenario: Expired preview cannot be approved
- **WHEN** the referenced preview session exists but `now >= expiresAt`
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_expired` and no approval row is created

#### Scenario: Session for another bundle is rejected
- **WHEN** the preview session belongs to a different project or bundle than the approve route
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_binding_mismatch` or `disclosure_preview_required` per the binding load rules and no approval row is created

#### Scenario: Body manifestHash mismatch is rejected
- **WHEN** `body.manifestHash` does not equal `bundle.manifestHash`
- **THEN** the response is HTTP 422 with `code` `disclosure_manifest_mismatch` and no approval row is created

#### Scenario: Preview policy mismatch is rejected
- **WHEN** the session's `previewPolicyId` is not equal to current `bounded-selected-text-v1`
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_policy_mismatch` and no approval row is created

#### Scenario: File mutation after preview blocks approval
- **WHEN** a valid unexpired preview session exists and a live file is mutated so content or integrity hash no longer matches before approve
- **THEN** the response is HTTP 422 with `code` `disclosure_preview_integrity_mismatch` and no approval row is created

#### Scenario: Unchanged files allow approval
- **WHEN** a valid unexpired preview session exists and live files still match the session integrity digest
- **THEN** the system returns HTTP 201, inserts one `ContextDisclosureApproval` with `contentTransmitted` false and both policy ids, and does not mutate the `ContextBundle` or preview session

### Requirement: Compute disclosure coverage with versioned policy identities
Disclosure status MUST report `approvalRequired` false only when a prior `ContextDisclosureApproval` exists with `decision` `approved` and exact equality of `projectId`, `stage`, `manifestHash`, `sourceHash`, `manifestSchemaVersion`, `selectionPolicyId`, `tokenEstimatorId`, `previewPolicyId`, and `approvalPolicyId` against the candidate bundle plus current policy constants. Changing either policy id MUST invalidate coverage and require a new preview and new approval. Latest covering approval governs status when multiple approvals exist. The system MUST expose `GET /projects/:id/context-bundles/:bundleId/disclosure-status` returning both current policy ids and `contentTransmitted` false, and `GET /projects/:id/disclosure-approvals?stage=&limit=1` returning zero or one latest approval ordered by `createdAt` DESC then `id` ASC. Invalid latest queries MUST return HTTP 422 `invalid_disclosure_approval_query`.

#### Scenario: First run requires approval
- **WHEN** no covering approval exists for the candidate fingerprint
- **THEN** disclosure status returns `approvalRequired` true

#### Scenario: Policy id change requires re-approval
- **WHEN** a prior approval exists but `previewPolicyId` or `approvalPolicyId` would no longer equal the current constants for coverage
- **THEN** disclosure status returns `approvalRequired` true until a new preview and approval under the current policies succeed

#### Scenario: Same manifestHash material remains coverable
- **WHEN** a covering approval exists for a fingerprint and a new bundle row shares the same coverage fields including `manifestHash`
- **THEN** disclosure status may return `approvalRequired` false without requiring a new approval solely because the bundle UUID differs

### Requirement: Map disclosure errors with non-overlapping codes and remain read-only
Disclosure APIs MUST use non-overlapping codes: `disclosure_preview_required`, `disclosure_preview_expired`, `disclosure_preview_binding_mismatch`, `disclosure_manifest_mismatch`, `disclosure_preview_policy_mismatch`, `disclosure_preview_integrity_mismatch`, `disclosure_preview_entry_unreadable`, `disclosure_preview_limit_exceeded`, `disclosure_preview_timeout`, `invalid_disclosure_approval`, `invalid_disclosure_approval_query`, `disclosure_preview_failed` (500), and `disclosure_approval_failed` (500). Approve check order MUST be required → expired → decision → manifest mismatch → binding mismatch → policy mismatch → integrity re-check. Unknown projects MUST return HTTP 404 `project_not_found`. Unknown bundles MUST return HTTP 404 `context_bundle_not_found`. Preview and approval MUST remain read-only toward the target repository and MUST NOT call DeepSeek or any external provider, execute Git or OpenSpec delivery commands, mutate repository files, reserve budget, or create review runs.

#### Scenario: Create does not mutate repositories or call providers
- **WHEN** a successful or blocked preview or approval completes
- **THEN** no files under the registered repository are created, modified, or deleted, and no DeepSeek or external provider call is performed

#### Scenario: Unexpected preview failure returns 500 without a session
- **WHEN** an unexpected exception occurs during preview construction or session persistence after integrity work
- **THEN** the response is HTTP 500 with `code` `disclosure_preview_failed` and no preview session row exists
