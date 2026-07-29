# context-bundle-manifest

## Purpose

Create and persist immutable stage-scoped context-bundle manifests from a shared same-bytes scanning pipeline, with safe metadata only (hashes, line ranges, token estimates) and no file bodies or transmission.

## Requirements

### Requirement: Create immutable context-bundle manifests from the shared same-bytes pipeline
The system SHALL create and persist immutable stage-scoped context-bundle manifests for a registered project and requested review stage using a shared internal scanning pipeline that resolves candidates, opens/reads each candidate at most once, classifies content, detects secrets, and—for clean files only—computes line ranges, SHA-256 `contentHash`, and token estimates from those exact same in-memory bytes before building exclusions and inserting one complete `ContextBundle` row. Review stages MUST be exactly the closed union `new` | `planning` | `applied` | `verify`. The create request body MUST be exactly `{ stage: ReviewStage }` and MUST NOT accept client-supplied paths, hashes, line ranges, token estimates, or file bodies. `ContextBundleService` MUST NOT invoke public secret-scan semantics and then reopen `eligiblePaths`, and MUST NOT independently reread a previously scanned file. Clean bytes MUST remain in memory only for the duration of the request and MUST NOT enter DTOs, logs, Prisma JSON, evidence, or external calls. The create flow MUST remain read-only toward the target repository and MUST NOT transmit payloads to DeepSeek or any external provider, execute Git or OpenSpec delivery commands, mutate repository files, preview file contents to operators, or require disclosure approval gates.

#### Scenario: Clean candidates create a persisted bundle
- **WHEN** an operator creates a context bundle for a registered project with active configuration whose shared-pipeline candidates include at least one clean scannable text file
- **THEN** the system returns HTTP 201 with `status` `ok`, persists exactly one new `ContextBundle` row, and returns entries with `path`, lowercase hex `contentHash`, full-file `lineRanges`, and `tokenEstimate` for each clean path

#### Scenario: Empty candidates persist an empty bundle
- **WHEN** the shared pipeline completes with `candidatePathCount` 0
- **THEN** the system returns HTTP 201 with empty `entries`, empty `exclusions`, `totalTokenEstimate` 0, algorithm identity fields set, and a persisted row

#### Scenario: Client-supplied paths or hashes are not accepted
- **WHEN** a create request includes any client path list, entry list, content hash, line range, or token estimate field
- **THEN** the system MUST NOT use those fields as create input and MUST NOT bypass the shared pipeline

#### Scenario: Bundle create does not reopen scanned files
- **WHEN** context-bundle creation runs for clean candidates
- **THEN** each clean candidate is opened/read only once and detectors, SHA-256, line counting, and token estimation consume the same in-memory byte object or immutable byte value

#### Scenario: Create does not mutate repositories or call providers
- **WHEN** a successful or blocked create completes
- **THEN** no files under the registered repository are created, modified, or deleted, and no DeepSeek or external provider call is performed

### Requirement: Persist append-only ContextBundle rows with algorithm identities
Successful creates MUST insert a new immutable UUID `ContextBundle` row owned by `apps/api` Prisma/PostgreSQL after the full in-memory manifest is built. Rows MUST include `manifestSchemaVersion` numeric `1`, `selectionPolicyId` exactly `full-file-lines-v1`, `tokenEstimatorId` exactly `unicode-codepoints-div-4-v1`, `manifestHash`, counts, safe `entries` JSON, and safe `exclusions` JSON. Rows MUST NOT include `contentTransmitted`, file bodies, matched secrets, snippets, or decoded text. Application services MUST expose create, get-by-id, and latest only—no product update or delete endpoints. Repeated identical material MAY insert another row with the same `manifestHash`; there MUST be no unique constraint on `manifestHash` and no idempotent upsert. Insert MUST occur in one Prisma transaction with zero partial rows on failure. `Project` MUST expose reverse relation `contextBundles` with cascade delete. `configurationVersionId` MUST be stored as a snapshot string without FK.

#### Scenario: Successful create returns 201 with a new UUID
- **WHEN** create succeeds twice for identical safe material
- **THEN** each response is HTTP 201 with a distinct `id`, both rows exist, and both share the same `manifestHash`

#### Scenario: Algorithm identities are persisted and returned
- **WHEN** a successful create response is inspected
- **THEN** `manifestSchemaVersion` is `1`, `selectionPolicyId` is `full-file-lines-v1`, and `tokenEstimatorId` is `unicode-codepoints-div-4-v1`

#### Scenario: No contentTransmitted field exists
- **WHEN** Prisma schema, DTOs, and successful responses are inspected
- **THEN** no `contentTransmitted` field is present

### Requirement: Apply full-file line ranges and Unicode code-point token estimates
Selection policy `full-file-lines-v1` MUST apply only to clean files with clean-byte material. Non-empty clean UTF-8 text MUST use exactly one inclusive range `{ startLine: 1, endLine: lineCount }` where `lineCount = text.split('\n').length` after fatal UTF-8 decode of the same clean bytes. Empty clean files MUST use `lineRanges: []` and `tokenEstimate` 0. Token estimator `unicode-codepoints-div-4-v1` MUST compute `tokenEstimate = codePointCount === 0 ? 0 : Math.ceil(codePointCount / 4)` over Unicode code points of that decoded text—not UTF-16 code units and not raw byte length. `totalTokenEstimate` MUST equal the sum of per-entry estimates. Oversize, unscannable, and secret-finding paths MUST NOT receive line ranges, content hashes, or token estimates.

#### Scenario: Non-empty clean file uses full-file range
- **WHEN** a clean file decodes to `"a\nb"`
- **THEN** its entry has `lineRanges` exactly `[{ startLine: 1, endLine: 2 }]` and a token estimate derived from Unicode code points of that text

#### Scenario: Empty clean file has empty ranges and zero tokens
- **WHEN** a clean file has byte length 0
- **THEN** its entry has `lineRanges` `[]` and `tokenEstimate` 0

### Requirement: Compute contentHash and full canonical manifestHash
Per-entry `contentHash` MUST be SHA-256 lowercase hex of the exact same in-memory clean bytes used by detectors (empty file uses the SHA-256 of zero-length input). Aggregate `manifestHash` MUST be SHA-256 lowercase hex over compact canonical JSON with keys in exact order: `manifestSchemaVersion`, `projectId`, `configurationVersionId`, `stage`, `sourceHash`, `selectionPolicyId`, `tokenEstimatorId`, `entries`, `exclusions`, `candidatePathCount`, `eligiblePathCount`, `excludedPathCount`, `findingCount`, `unscannableCount`, `totalTokenEstimate`. Entry key order MUST be `path`, `contentHash`, `lineRanges`, `tokenEstimate`. Line-range key order MUST be `startLine`, `endLine`. Exclusions MUST be sorted by exact JS path comparison with key order `path`, `reason`. `id` and `createdAt` MUST be excluded from the digest. Changing exclusions, algorithm ids, entry order, or counts MUST change `manifestHash`.

#### Scenario: Identical material yields stable manifestHash
- **WHEN** two creates produce identical safe manifest material
- **THEN** both responses share the same `manifestHash` even when `id` and `createdAt` differ

#### Scenario: Changed exclusion changes manifestHash
- **WHEN** otherwise identical material differs only by a safe exclusion entry
- **THEN** `manifestHash` differs

#### Scenario: Entry order affects manifestHash
- **WHEN** the same entries appear in different eligible order
- **THEN** `manifestHash` differs

### Requirement: Classify oversize files as unscannable_content exactly as secret scan
When `fileSize > 1048576`, the shared pipeline MUST classify the path as `unscannable_content`, MUST NOT read bytes, MUST NOT run detectors, MUST NOT produce clean-byte material, MUST NOT increment `totalBytesRead`, and MUST include the path as an exclusion with reason `unscannable_content`. If at least one clean path remains, create MUST continue and persist the full manifest. If `candidatePathCount >= 1` and all candidates are excluded, create MUST propagate HTTP 422 `unsafe_context_bundle` with required safe counts only and persist zero rows. Oversize MUST NOT map to any bundle-specific unreadable code.

#### Scenario: Oversize plus clean file creates a bundle
- **WHEN** candidates include one oversize file and one clean file
- **THEN** the response is HTTP 201, the oversize path appears in `exclusions` as `unscannable_content`, and the clean file appears in `entries`

#### Scenario: Sole oversize candidate blocks unsafely
- **WHEN** `candidatePathCount` is at least 1 and the only candidate is oversize
- **THEN** the response is HTTP 422 with `code` `unsafe_context_bundle`, required safe counts only, and no `ContextBundle` row

### Requirement: Expose create get and latest APIs with closed error contracts
The system MUST expose `POST /projects/:id/context-bundles`, `GET /projects/:id/context-bundles/:bundleId`, and `GET /projects/:id/context-bundles?stage=<ReviewStage>&limit=1`. Successful create MUST return HTTP 201 `ContextBundleOkDto`. Successful get MUST return HTTP 200 `ContextBundleOkDto`. Latest with `limit` 1 MUST return HTTP 200 `{ status: 'ok', items: ContextBundleOkDto[] }` of length 0 or 1 ordered by `createdAt` DESC then `id` ASC. `ContextBundleBlockedCode` MUST be exactly `SecretScanBlockedCode`. `ContextBundleBlockedDto` MUST represent only resolve/scan/shared-pipeline blocks, with `candidatePathCount`, `findingCount`, and `unscannableCount` required only when `code` is `unsafe_context_bundle` and absent otherwise. Unexpected exceptions during SHA-256, fatal UTF-8 decode of clean material, line-range calculation, token estimation, canonical construction, or `manifestHash` calculation MUST return HTTP 500 `ProjectErrorResponse` `context_bundle_failed` with a safe message and zero rows. Prisma/transaction/infrastructure insert failures MUST return HTTP 500 `context_bundle_failed` with zero partial rows. Invalid latest query shapes MUST return HTTP 422 `invalid_context_bundle_query` on `ProjectErrorResponse` or a dedicated query-error contract; that code MUST NOT be a `ContextBundleBlockedCode` and MUST NOT represent a blocked create. Unknown projects MUST return HTTP 404 `project_not_found`. Unknown bundle ids for the project MUST return HTTP 404 `context_bundle_not_found`.

#### Scenario: Get returns a persisted bundle
- **WHEN** an operator GETs a previously created bundle id for the same project
- **THEN** the response is HTTP 200 with the persisted ok DTO

#### Scenario: Propagated secret_scan_limit_exceeded persists no row
- **WHEN** shared-pipeline total-byte overflow occurs during create
- **THEN** the response is HTTP 422 with `code` `secret_scan_limit_exceeded` and no bundle row exists

#### Scenario: Propagated secret_scan_timeout persists no row
- **WHEN** shared-pipeline wall-time timeout occurs during create
- **THEN** the response is HTTP 422 with `code` `secret_scan_timeout` and no bundle row exists

#### Scenario: Construction failure returns 500 context_bundle_failed
- **WHEN** an unexpected exception occurs in hash, decode, line-range, token, canonical, or manifestHash construction after clean material exists
- **THEN** the response is HTTP 500 with `code` `context_bundle_failed` and no bundle row exists

#### Scenario: Prisma failure returns 500 without partial rows
- **WHEN** the insert transaction fails
- **THEN** the response is HTTP 500 with `code` `context_bundle_failed` and no partial `ContextBundle` row remains

#### Scenario: Invalid latest limit is a query error
- **WHEN** latest is requested with `limit` not equal to 1
- **THEN** the response is HTTP 422 with `code` `invalid_context_bundle_query` and the body is not a `ContextBundleBlockedDto`

### Requirement: Keep preview approval and transmission out of this slice
Context-bundle create/get/latest MUST NOT preview file contents, collect disclosure approval, mark transmission, call DeepSeek, reserve budget, create review runs, or mutate `ContextBundle` rows after insert. Create/get/latest responses MUST omit file bodies, decoded text, matched secrets, approval decisions, and transmission flags, and MUST continue to forbid `contentTransmitted` on bundle DTOs and Prisma rows. A separate capability (`context-preview-and-approval`) MAY consume immutable bundle identity (`id`, `manifestHash`, entries, algorithm/policy ids) for operator preview and disclosure approval through separate related audit aggregates. That capability MUST NOT mutate `ContextBundle` rows and MUST NOT reopen create/get/latest product Non-Goals beyond supplying that identity.

#### Scenario: Success does not expose file contents or approval controls
- **WHEN** create or get succeeds
- **THEN** responses omit file bodies, decoded text, matched secrets, approval decisions, and transmission flags

#### Scenario: No update or delete product endpoints
- **WHEN** the projects API surface for context bundles is inspected
- **THEN** no product update or delete endpoint for `ContextBundle` is exposed

#### Scenario: Disclosure capability may consume identity without mutating the bundle
- **WHEN** a later disclosure preview or approval succeeds for a bundle
- **THEN** the corresponding `ContextBundle` row remains unchanged and still has no `contentTransmitted` field
