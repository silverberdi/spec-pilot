## Context

Wave `w02-s01` and `w02-s02` are archived: SpecPilot can resolve a deterministic stage-scoped candidate path set and fail-closed secret-scan it into an eligible path set (path omit + `unsafe_context_bundle` when nothing remains). Scan and resolve results are ephemeral—operators still lack a durable, hash-addressed, token-estimated context identity for later preview/approval and review runs.

Slice `w02-s03-context-bundle-manifest` creates immutable `ContextBundle` manifests from clean candidate bytes produced by a **shared in-process scanning pipeline**: per-entry content hashes, selected line ranges, exclusion metadata, algorithm identities, and deterministic token estimates. Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding. This slice does **not** preview file contents or collect disclosure approval (`w02-s04`).

## Goals / Non-Goals

**Goals:**

- Create and persist an immutable context-bundle manifest for a registered project and review stage (`new` | `planning` | `applied` | `verify`) using a shared internal pipeline that resolves, opens/reads each candidate **once**, classifies, detects secrets, and—for clean files only—computes line ranges, `contentHash`, and token estimates from those **exact same in-memory bytes**.
- Never accept client-supplied paths, hashes, ranges, or file bodies; never reopen a previously scanned file during bundle creation.
- Persist safe exclusion summary metadata (paths + reason codes / counts) and algorithm identity fields without raw secret values, match text, or file bodies.
- Fail closed when resolve/scan fails, the bundle is unsafe, files are unreadable, bounds are exceeded, or hashing/token estimation cannot complete; never return a partial “ok” manifest or persist incomplete rows.
- Remain read-only toward target repositories; no DeepSeek / external transmission; no Git/OpenSpec/delivery execution from SpecPilot.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for manifest outcomes (success, empty, blocked, loading, error).
- Deliver deterministic automated evidence for success (hashes + token estimates + same-bytes invariant) and at least one blocked/failure path; keep quality gates green without weakening repo-level secret scanning.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Context preview UI that displays file contents, or disclosure approval gates (`w02-s04`).
- DeepSeek product API calls, review runs, findings ledger as product evidence, budget reservation/enforcement, prompts.
- Intelligent section reduction / relevance ranking beyond full-file line ranges (this slice uses whole-file selection).
- Expanding `schemaVersion: 1` or changing portable `project.yaml` context patterns.
- Editing target repositories; executing delivery/Git write/OpenSpec workflows from SpecPilot.
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Weakening SpecPilot repo-level `baseline-validation-and-secret-scanning` / quality gates to pass fixtures.
- Accepting client-supplied path lists, content hashes, line ranges, or token estimates as create input.
- Storing transmitted payloads, decoded file bodies, or raw secret values in PostgreSQL or API responses.
- Mutating `ContextBundle` rows for approval/transmission; introducing the future disclosure/transmission audit model in this slice.
- Changing public secret-scan HTTP product behavior (refactor internals only to share the safe pipeline).
- Editing OpenSpec-generated integrations except via `openspec update`.

## Decisions

### D1 — Durable immutable `ContextBundle` (persistence)

Unlike resolve/scan, manifests are **persisted** as immutable rows in SpecPilot PostgreSQL (Prisma owned by `apps/api`).

| Concern | Approach |
|---|---|
| Identity | UUID `id`; never update row contents after insert |
| Freshness | Each successful create inserts a new row from one live shared pipeline run |
| History | Append-only: multiple bundles per project/stage allowed; identical material MAY yield the same `manifestHash` on a new UUID row |
| Project pointer | **No** `Project.latestContextBundleId` in this slice—query by `id` or “latest” list endpoint |
| Product mutations | Create / get / latest **only**—no update or delete product endpoint |

Persist:

- Identity: `id`, `projectId`, `configurationVersionId`, `stage`, `sourceHash` (config snapshot hash at create time), `createdAt`
- Algorithm identities: `manifestSchemaVersion` (= `1`), `selectionPolicyId` (= `'full-file-lines-v1'`), `tokenEstimatorId` (= `'unicode-codepoints-div-4-v1'`)
- Aggregate: `manifestHash`, `entryCount`, `totalTokenEstimate`, `candidatePathCount`, `eligiblePathCount`, `excludedPathCount`, `findingCount`, `unscannableCount`
- Payload JSON: `entries[]`, `exclusions[]` (safe fields only—D6/D7)

Do **not** persist: file bodies, matched secrets, snippets, offsets, line-of-secret numbers, absolute host paths, disclosure approval decisions, transmission flags, or any `contentTransmitted` field.

**Database / repository invariants (binding):**

- Every successful `POST` creates a **new** `ContextBundle` UUID row and returns **201**.
- Repeated identical input MAY create another row with the **same** `manifestHash`.
- **No** unique constraint on `manifestHash`; **no** idempotent upsert.
- Application repository/service exposes **create / read / latest only**—no update/delete APIs.
- `Project` cascade delete remains local ownership behavior; Prisma MUST include the reverse `contextBundles` relation on `Project`.
- `configurationVersionId` remains a snapshot **string without FK** (unchanged decision).
- One Prisma transaction inserts the **complete** row only after the entire in-memory manifest has been successfully built. No partial row or child write may exist on any failure.

- *Alternative considered:* ephemeral-only manifest (no Prisma). Rejected — domain model + context-and-privacy audit require durable path/hash/range/token records; proposal requires persistence.
- *Alternative considered:* upsert “latest only” per project+stage. Rejected — loses audit history; immutability prefers append-only inserts.
- *Alternative considered:* add `Project.latestContextBundleId`. Deferred — GET latest by query is enough; avoids pointer races until review-run ownership needs it.
- *Alternative considered:* store `contentTransmitted` on the bundle for forward-compat. Rejected — mutability pressure for `w02-s04`; transmission/approval MUST be a separate related audit aggregate later, not a field on this immutable row.

### D2 — Shared same-bytes pipeline (binding; never reopen)

Public secret-scan and context-bundle creation MUST reuse the **same internal scanning engine / orchestration primitive**. Refactoring archived `w02-s02` internals is allowed **only** to extract this shared safe in-process pipeline; do **not** reopen secret-scan product scope or change its public HTTP behavior.

**Binding pipeline order:**

```
resolve
→ safe open/read once (per candidate)
→ classify
→ detect secrets
→ for each clean file, using the exact same in-memory bytes:
     - compute line ranges
     - compute contentHash
     - compute token estimate
→ build exclusions
→ (bundle create only) persist manifest atomically
```

**Same-bytes invariant (binding):**

- For each clean candidate, the exact `Buffer` / `Uint8Array` instance (or immutable byte value) used by secret detectors MUST also be the sole input to SHA-256 `contentHash`, fatal UTF-8 decode, line counting, and token estimation.
- The internal engine MAY expose ephemeral clean-file material (`path` + bytes + derived safe metadata) **only** to trusted in-process consumers (bundle create).
- Clean bytes remain in memory **only** for the duration of the request; then discarded.
- Raw bytes and decoded text MUST NOT enter DTOs, logs, Prisma JSON, evidence artifacts, or external calls.
- Secret / unscannable files produce exclusions (and scan findings / unscannable DTOs as today) but **no** clean-byte material for hashing.
- If the internal scan fails, times out, exceeds bounds, becomes unsafe, or encounters an unreadable entry: return the corresponding blocked/error outcome and **persist no** `ContextBundle`.

**Public surfaces:**

| Surface | Behavior |
|---|---|
| `POST .../context-sources/secret-scan` | Unchanged product semantics: stage → shared engine → `SecretScanOkDto` / blocked DTOs **without** exposing clean bytes |
| `POST .../context-bundles` | Accepts only `{ stage: ReviewStage }` → shared engine (with clean-byte material) → build full safe manifest in memory → single transactional insert → **201** |

**Forbidden for `ContextBundleService`:**

- Invoking public scan semantics and then reopening `eligiblePaths`.
- Independently rereading a previously scanned file.
- Accepting client `paths[]`, `entries[]`, hashes, ranges, or token estimates.
- Calling resolve alone and skipping secret detection.

- *Alternative considered:* call public `SecretDetectionService.scan()` then reopen eligible paths to hash. Rejected — does not guarantee hashed bytes equal scanned-clean bytes (TOCTOU / mutation).
- *Alternative considered:* client posts eligible paths from a prior scan. Rejected — path injection / stale eligibility / bypass of scan.
- *Alternative considered:* create from resolve candidates without secret detection. Rejected — violates Wave 2 secret-gate ordering.
- *Alternative considered:* require UI to call scan then create. Rejected for API safety—server must run the shared pipeline even if UI already scanned.

### D3 — Full-file line ranges (no section reduction in this slice)

Architecture mentions selected line ranges. For `w02-s03`, selection policy id is **`full-file-lines-v1`**. Line ranges apply **only** to clean files that produced in-memory clean-byte material. Oversize / unscannable / secret-finding paths are **exclusions only**—they never receive `lineRanges`, `contentHash`, or token estimates.

| Clean file | Line ranges |
|---|---|
| Non-empty UTF-8 text | Exactly one range: `{ startLine: 1, endLine: lineCount }` inclusive |
| Empty file (`byteLength === 0`) | `lineRanges: []`; token estimate `0` |

**Line counting (binding):** After fatal UTF-8 decode of the **same** in-memory clean bytes, `lineCount = text.split('\n').length` (JavaScript `String.prototype.split` semantics). Example: `"a\nb"` → `2`; `"a\nb\n"` → `3`; `""` → empty ranges (do not use split on empty for a fake `1`).

Selected bytes for hashing and tokens are those **exact** clean-file bytes (entire file). No mid-file truncation, relevance ranking, or AST-based sectioning; no second filesystem read. Files with `fileSize > 1048576` are classified as `unscannable_content` in D6 and are never line-ranged.

- *Alternative considered:* heuristic “relevant sections” now. Rejected — Non-Goal; needs product evidence and belongs with later context-minimization work; full-file is auditable and deterministic.
- *Alternative considered:* omit line ranges until preview. Rejected — domain/audit require ranges; full-file ranges satisfy the contract without claiming section reduction.
- *Alternative considered:* treat oversize as a hard bundle error. Rejected — must preserve public `w02-s02` unscannable exclusion semantics (D6).

### D4 — Content hash and manifest hash (binding)

#### D4.1 — Per-entry content hash

- Algorithm: **SHA-256**
- Input: the **exact same in-memory clean bytes** used by secret detectors for that path (not normalized, not re-encoded, not reread)
- Encoding in DTOs/DB: **lowercase hexadecimal** (64 chars), field name `contentHash`
- Empty file: SHA-256 of zero-length input (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`)

#### D4.2 — Aggregate `manifestHash` (full safe manifest)

Compute SHA-256 lowercase hex over **compact canonical JSON** (UTF-8 bytes of the JSON text) with keys in **exact binding insertion order**:

```ts
{
  manifestSchemaVersion: 1, // numeric
  projectId: string;
  configurationVersionId: string;
  stage: ReviewStage;
  sourceHash: string;
  selectionPolicyId: 'full-file-lines-v1';
  tokenEstimatorId: 'unicode-codepoints-div-4-v1';
  entries: Array<{
    path: string;
    contentHash: string;
    lineRanges: Array<{ startLine: number; endLine: number }>;
    tokenEstimate: number;
  }>;
  exclusions: Array<{
    path: string;
    reason: 'secret_finding' | 'unscannable_content';
  }>;
  candidatePathCount: number;
  eligiblePathCount: number;
  excludedPathCount: number;
  findingCount: number;
  unscannableCount: number;
  totalTokenEstimate: number;
}
```

**Canonical rules (binding):**

1. `manifestSchemaVersion` is numeric `1`.
2. Top-level keys in the exact order shown above.
3. `entries` preserve eligible (clean) scan order.
4. Each entry key order: `path`, `contentHash`, `lineRanges`, `tokenEstimate`.
5. Each line-range key order: `startLine`, `endLine`.
6. `exclusions` sorted by exact JS path comparison (`a < b`).
7. Each exclusion key order: `path`, `reason`.
8. Compact `JSON.stringify` with **no** added whitespace; build plain objects with the binding insertion order (do not rely on sorting arbitrary maps).
9. Digest: lowercase SHA-256 hexadecimal.
10. `id` and `createdAt` are **excluded**—they are persistence identity, not manifest material.

**Consequences:**

- Changing a safe exclusion changes `manifestHash`.
- Changing `selectionPolicyId` or `tokenEstimatorId` changes `manifestHash`.
- Recreating identical safe manifest material produces the **same** `manifestHash`, even though append-only policy creates a new UUID row.
- Multiple rows with the same `manifestHash` remain allowed; no unique constraint or idempotent upsert in this slice.
- Entry order affects `manifestHash`.

- *Alternative considered:* hash only entry contentHashes / omit exclusions. Rejected — full safe-manifest identity must bind exclusions, counts, and algorithm ids for audit integrity.
- *Alternative considered:* include `id` / `createdAt` in the digest. Rejected — would make every insert a unique hash and break “same material → same manifestHash.”

### D5 — Token estimate (binding, local-only, no provider)

No DeepSeek/tiktoken network dependency. Estimator id: **`unicode-codepoints-div-4-v1`**.

| Parameter | Binding |
|---|---|
| Decode | Fatal UTF-8 decode of the **same** in-memory clean bytes |
| Unit | **Unicode code points** of that decoded text (`[...text].length` / equivalent)—**not** “UTF-8 code points,” not UTF-16 code units, not raw byte length |
| Formula | `tokenEstimate = codePointCount === 0 ? 0 : Math.ceil(codePointCount / 4)` |
| Per-entry | Compute on that entry’s decoded full-file text |
| Aggregate `totalTokenEstimate` | Sum of per-entry estimates (integer; no floating intermediate retained) |

Document in operator copy that estimates are **local approximations** for budgeting prep—not provider billing truth (`w03` reconciles actuals later).

- *Alternative considered:* add `@dqbd/tiktoken` / cl100k_base. Rejected for this slice—new native/wasm weight and version drift; `/4` is deterministic, dependency-free, and sufficient until budget slice needs tighter parity.
- *Alternative considered:* estimate on bytes/4. Rejected — multi-byte UTF-8 would under-count relative to typical LLM char heuristics; Unicode code points are stabler for Spanish/Unicode sources.

### D6 — Shared open/read/classify bounds and exclusions (binding)

All candidate open/read/classify/detect work happens **once** inside the shared engine (D2). Bundle creation MUST consume clean in-memory bytes from that pass and MUST NOT reopen paths. Public `POST .../secret-scan` behavior remains unchanged and MUST use this same classification.

Reject **before** open with **422** `context_path_escape` when the repository-relative path is absolute, has leading `./`, contains `\`, contains a `..` segment, or contains NUL.

Per candidate inside the shared engine:

1. Join only under canonical `repositoryPath`.
2. Open with **`O_RDONLY | O_NOFOLLOW`**.
3. `fstat` the same fd; require regular file.
4. **Oversize (binding, exact `w02-s02` semantics — no alternate):** if `fileSize > 1048576`:
   - classify the path as `unscannable_content`;
   - **do not** read bytes;
   - **do not** run detectors;
   - **do not** produce clean-byte material;
   - **do not** increment `totalBytesRead`;
   - include the path as an exclusion with reason `unscannable_content`;
   - **do not** map oversize to any bundle-specific or `*_entry_unreadable` code.
5. Before read (eligible-size files only): if `totalBytesRead + fileSize > 52428800` → **422** `secret_scan_limit_exceeded`; no partial ok; **no** bundle row.
6. Read complete bytes from the same fd into memory; close fd in `finally`.
7. Classify (NUL / invalid UTF-8 → unscannable exclusion, no clean material); else run detectors on those bytes.
8. Clean files: keep the **same** byte object for hash / fatal UTF-8 decode / line count / token estimate (bundle create path).
9. Symlink / ELOOP / missing / non-regular / EACCES / EPERM / short read mid-pipeline → **422** `secret_scan_entry_unreadable`; **no** partial ok; **no** DB insert.
10. Max content-processing wall time **30000** ms **excluding** resolve time → **422** `secret_scan_timeout`; no partial eligible/clean set; **no** bundle row.

**Post-classification outcomes for bundle create (binding):**

| Condition | Outcome |
|---|---|
| At least one clean path remains | Continue: build entries from clean in-memory bytes + exclusions; persist full manifest → **201** |
| `candidatePathCount >= 1` and all candidates excluded (secrets and/or unscannable, including oversize-only) | Propagate **422** `unsafe_context_bundle` with the three safe counts only; **persist zero** `ContextBundle` rows |
| Shared-pipeline expected failures (path escape, limit, timeout, unreadable, resolve blocks) | Propagate matching `SecretScanBlockedCode`; **persist zero** rows |

**After** the shared pipeline has produced clean in-memory material, construction and persistence failures map exclusively as follows (D7):

| Condition | HTTP | Body |
|---|---|---|
| Unexpected exception in SHA-256, fatal UTF-8 decode of clean material, line-range calculation, token estimation, canonical manifest construction, or `manifestHash` calculation | **500** | `ProjectErrorResponse` `context_bundle_failed` (safe message); **zero** rows |
| Prisma / transaction / infrastructure error during insert | **500** | `ProjectErrorResponse` `context_bundle_failed`; **zero** partial rows |

Do **not** use “422 or 500 as appropriate.” Do **not** convert unexpected internal construction errors into entry-unreadable or any `ContextBundleBlockedDto` code. Expected filesystem/classification failures are already resolved inside the shared pipeline and retain `SecretScanBlockedCode`.

Do **not** introduce a second filesystem pass that could observe mutated content. A repository-file mutation after the single read MUST NOT cause a reread; the in-memory bytes remain authoritative for that request.

**Exclusions on successful bundle (binding):**

```ts
type ContextBundleExclusionDto = {
  path: string;
  reason: 'secret_finding' | 'unscannable_content';
};
```

- One exclusion per excluded path.
- Secret findings → reason `secret_finding` (no detector ids on the exclusion list).
- Unscannable (including oversize, NUL, invalid UTF-8) → reason `unscannable_content`.
- Sort exclusions by `path` with exact JS `a < b`.
- Counts: `findingCount` / `unscannableCount` use scan summary semantics (deduped findings count; unique unscannable paths).
- `excludedPathCount` MUST equal `exclusions.length`.

- *Alternative considered:* reopen eligible paths after public scan to hash. Rejected — same-bytes invariant; TOCTOU.
- *Alternative considered:* treat oversize as hard fail / `*_entry_unreadable`. Rejected — must match public secret-scan unscannable exclusion + empty-after-exclude `unsafe_context_bundle`.
- *Alternative considered:* skip unreadable candidates and continue. Rejected — incomplete pipeline must not look successful (`secret_scan_entry_unreadable`).
- *Alternative considered:* store detector ids on exclusions. Deferred — path + reason is enough for audit.

### D7 — Response / persistence contract (binding)

Shared contracts in `packages/shared-contracts`:

```ts
type ReviewStage = 'new' | 'planning' | 'applied' | 'verify'; // reuse

type ContextBundleLineRangeDto = {
  startLine: number; // >= 1
  endLine: number;   // >= startLine
};

type ContextBundleEntryDto = {
  path: string;
  contentHash: string; // sha-256 hex lowercase
  lineRanges: ContextBundleLineRangeDto[];
  tokenEstimate: number; // integer >= 0
};

type ContextBundleExclusionDto = {
  path: string;
  reason: 'secret_finding' | 'unscannable_content';
};

type ContextBundleOkDto = {
  status: 'ok';
  id: string;
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  createdAt: string; // ISO-8601
  manifestSchemaVersion: 1;
  selectionPolicyId: 'full-file-lines-v1';
  tokenEstimatorId: 'unicode-codepoints-div-4-v1';
  manifestHash: string;
  entryCount: number; // MUST equal entries.length
  totalTokenEstimate: number;
  candidatePathCount: number;
  eligiblePathCount: number; // MUST equal entryCount
  excludedPathCount: number; // MUST equal exclusions.length
  findingCount: number;
  unscannableCount: number;
  entries: ContextBundleEntryDto[];
  exclusions: ContextBundleExclusionDto[];
  // NO contentTransmitted
};

// Exact alias — no bundle-only 422 codes; no reserved future members in this closed union:
type ContextBundleBlockedCode = SecretScanBlockedCode;
// Includes: context_path_escape, secret_scan_limit_exceeded, secret_scan_timeout,
// secret_scan_entry_unreadable, unsafe_context_bundle, and resolve-propagated codes.
// Does NOT include: context_bundle_limit_exceeded, context_bundle_timeout,
// context_bundle_entry_unreadable, invalid_context_bundle_query, context_bundle_failed.

type ContextBundleBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null;
  code: ContextBundleBlockedCode;
  message: string;
  // REQUIRED iff code === 'unsafe_context_bundle'; ABSENT for all other blocked codes:
  candidatePathCount?: number;
  findingCount?: number;
  unscannableCount?: number;
};

type ContextBundleDto = ContextBundleOkDto | ContextBundleBlockedDto;
```

`ContextBundleBlockedDto` represents **only** block outcomes propagated by resolve / secret-scan / shared pipeline. It does **not** represent construction/persistence failures (`context_bundle_failed`) or latest-query validation (`invalid_context_bundle_query`).

**Empty success:** shared pipeline ok with `candidatePathCount === 0` → create and persist a bundle with `entries: []`, `exclusions: []`, `totalTokenEstimate: 0`, algorithm ids set, `manifestHash` over the full canonical empty-material object, counts zeroed appropriately → **201**.

**Oversize mixed with clean:** oversize paths appear only in `exclusions` as `unscannable_content`; clean paths appear in `entries`; persist → **201**.

**Oversize-only (or all excluded):** `candidatePathCount >= 1` and zero clean paths → **422** `unsafe_context_bundle` with required safe counts only; zero rows.

**HTTP mapping:**

| Outcome | HTTP | Body |
|---|---|---|
| Created (including empty; including oversize exclusions with remaining clean) | **201** | `ContextBundleOkDto` |
| GET existing / latest items | **200** | `ContextBundleOkDto` / list wrapper |
| Unknown project | **404** | `ProjectErrorResponse` `project_not_found` |
| Unknown bundle id for project | **404** | `ProjectErrorResponse` `context_bundle_not_found` |
| Resolve/scan/shared-pipeline blocks | **422** | `ContextBundleBlockedDto` (`ContextBundleBlockedCode` = `SecretScanBlockedCode`) |
| Invalid latest query (`limit` ≠ 1, missing/invalid stage as query error) | **422** | `ProjectErrorResponse` (or dedicated query-error contract) `invalid_context_bundle_query` — **not** a `ContextBundleBlockedCode` |
| Unexpected construction (hash/decode/lines/tokens/canonical/`manifestHash`) | **500** | `ProjectErrorResponse` `context_bundle_failed` |
| Prisma / transaction / infra on insert | **500** | `ProjectErrorResponse` `context_bundle_failed` |

- *Alternative considered:* HTTP 200 on create. Rejected — 201 matches configuration attach style for durable creates.
- *Alternative considered:* bundle-specific 422 codes for limits/timeouts/unreadable. Rejected — shared pipeline already owns those as `SecretScanBlockedCode`.
- *Alternative considered:* persist file bodies or `contentTransmitted` for preview. Rejected — Non-Goal; immutability; `w02-s04` owns separate disclosure audit later.

### D8 — API surface

#### `POST /projects/:id/context-bundles`

Request: `{ stage: ReviewStage }`  
Behavior: validate stage → shared same-bytes pipeline (D2/D6) → build full safe manifest in memory → **one** Prisma transaction insert → **201** ok DTO.  
No update/delete endpoints.

#### `GET /projects/:id/context-bundles/:bundleId`

Return persisted ok DTO for that project; **404** if missing or wrong project.

#### `GET /projects/:id/context-bundles?stage=<ReviewStage>&limit=1`

Optional “latest” helper for operator UX: `stage` required; `limit` fixed to **1** in this slice. Reject other `limit` values (and invalid latest query shapes) with **422** `invalid_context_bundle_query` on `ProjectErrorResponse` (or a dedicated query-error contract). That code:

- belongs to project/query error responses;
- does **not** belong to `ContextBundleBlockedCode`;
- does **not** represent a blocked bundle create.

Return **200** with `{ status: 'ok', items: ContextBundleOkDto[] }` length 0 or 1 ordered by `createdAt DESC`, `id ASC` tie-break. No pagination beyond this.

Error summary:

| Condition | HTTP | Code |
|---|---|---|
| Unknown `projectId` | 404 | `project_not_found` |
| Unknown bundle | 404 | `context_bundle_not_found` |
| Resolve/scan/shared-pipeline refusals on create | 422 | `ContextBundleBlockedCode` (= `SecretScanBlockedCode`) via `ContextBundleBlockedDto` |
| Invalid review stage on create body | 422 | `invalid_review_stage` (existing stage validation / blocked propagation as today) |
| Invalid latest query | 422 | `invalid_context_bundle_query` (`ProjectErrorResponse` / query contract — not blocked-union) |
| Unexpected construction or Prisma/infra | 500 | `context_bundle_failed` |

- *Alternative considered:* nest under `/context-sources/bundles`. Rejected — bundles are durable aggregates; top-level under project matches configuration/discovery style.
- *Alternative considered:* no GET list/latest. Rejected lightly—US-003 benefits from re-opening latest; keep `limit=1` only.

### D9 — Prisma model (binding shape)

```prisma
model Project {
  // ... existing fields ...
  contextBundles ContextBundle[]
}

model ContextBundle {
  id                       String   @id @default(uuid())
  projectId                String   @map("project_id")
  configurationVersionId   String   @map("configuration_version_id")
  stage                    String
  sourceHash               String   @map("source_hash")
  manifestSchemaVersion    Int      @map("manifest_schema_version") // always 1 in this slice
  selectionPolicyId        String   @map("selection_policy_id") // 'full-file-lines-v1'
  tokenEstimatorId         String   @map("token_estimator_id") // 'unicode-codepoints-div-4-v1'
  manifestHash             String   @map("manifest_hash")
  entryCount               Int      @map("entry_count")
  totalTokenEstimate       Int      @map("total_token_estimate")
  candidatePathCount       Int      @map("candidate_path_count")
  eligiblePathCount        Int      @map("eligible_path_count")
  excludedPathCount        Int      @map("excluded_path_count")
  findingCount             Int      @map("finding_count")
  unscannableCount         Int      @map("unscannable_count")
  entries                  Json
  exclusions               Json
  createdAt                DateTime @default(now()) @map("created_at")
  project                  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, stage, createdAt])
  @@map("context_bundles")
}
```

- Rows are insert-only; application MUST NOT update `entries` / hashes / algorithm ids after create.
- **No** `contentTransmitted` column.
- **No** unique constraint on `manifestHash`.
- FK to `Project` with cascade delete; reverse relation `Project.contextBundles` required for Prisma validation.
- `configurationVersionId` stored as string without FK.

- *Alternative considered:* normalize entries into child table. Rejected — JSON payload matches configuration snapshot style and keeps migrations small.
- *Alternative considered:* FK `configurationVersionId` → `ProjectConfigurationVersion`. Optional later; string snapshot id is enough for audit join by value.

### D10 — Modular monolith boundaries

Implement inside existing `apps/api` `ProjectsModule`:

- **Shared internal pipeline** (extracted/refactored from `w02-s02` secret-scan internals): resolve → single open/read → classify → detect → optional clean-byte material for trusted callers. Public `SecretDetectionService.scan` remains a thin adapter that returns only safe scan DTOs (no bytes).
- `ContextBundleService`: `create(projectId, stage)`, `get(projectId, bundleId)`, `latest(projectId, stage)`—**create/read/latest only**. `create` MUST call the shared engine with clean-byte material enabled and MUST NOT call public scan-then-reopen.
- Pure helpers: SHA-256 hex, line-count, Unicode code-point token estimate, canonical `manifestHash`—unit-testable without Nest; must accept an explicit bytes argument so same-object tests can assert identity.
- Shared DTOs/type guards in `packages/shared-contracts` (including algorithm id literals).
- Additive Prisma migration only.
- No new Nx domain package; web → shared-contracts only; API must not import web.
- No tokenizer package dependency.

- *Alternative considered:* new `ContextModule`. Deferred — single consumer under projects until review-run appears.
- *Alternative considered:* ContextBundleService depends only on public scan HTTP/DTO surface. Rejected — cannot satisfy same-bytes invariant.

### D11 — Minimal Angular manifest outcomes

Extend the existing Spanish-first console (same project + stage selection):

- Action “Crear manifiesto de contexto” (or equivalent) distinct from resolve and secret-scan.
- On success: show stage, `entryCount`, `totalTokenEstimate`, `manifestHash` short prefix (first 12 hex chars), `sourceHash` short prefix, `selectionPolicyId`, `tokenEstimatorId`, `manifestSchemaVersion`, exclusion counts; list entries with `path`, short `contentHash` prefix, `tokenEstimate`, and line-range summary; display cap **200** entries; when `entryCount > 200` show copy equivalent to `Mostrando 200 de N entradas`.
- On `unsafe_context_bundle` (propagated): show message + three safe counts only (no paths).
- States: idle, loading, success (including empty), blocked/error (`message`/`code`).
- MUST NOT fetch or display file contents; MUST NOT offer approve/send-to-DeepSeek controls; MUST NOT show or imply a transmission flag on the bundle.
- Optional “cargar último” using GET latest `limit=1` when a project+stage is selected.

- *Alternative considered:* API-only. Rejected — US-003 requires operator-visible console outcomes.
- *Alternative considered:* reuse scan button to always create manifests. Rejected — keep scan and manifest as distinct operator actions.

### D12 — Test strategy and evidence

Jest + existing Testcontainers PostgreSQL pattern:

1. **Unit — hashing:** empty + known fixture bytes → exact SHA-256 hex; no normalization; hash input is the provided byte object.
2. **Unit — line ranges:** binding split semantics; empty → `[]`; non-empty full-file range from decoded same bytes; oversize paths never get line ranges.
3. **Unit — tokens:** Unicode code-point `/4` ceil; empty → 0; aggregate sum; multi-byte characters count as one code point each.
4. **Unit — manifestHash:**
   - stable hash for identical full safe material;
   - changed exclusion changes hash;
   - changed `selectionPolicyId` / `tokenEstimatorId` changes hash;
   - `id` / `createdAt` do not affect hash;
   - entry order affects hash;
   - key-order / compact JSON stability.
5. **Same-bytes / single-open (required):**
   - Spy/assert a clean candidate is opened/read **only once** during bundle creation.
   - Assert detector, hash, line-count, and token-estimator consume the **same byte object** or immutable byte value.
   - Simulate a repository-file mutation opportunity after the single read; prove bundle creation does **not** reread the changed path and still hashes the original in-memory bytes.
   - Assert no raw bytes/text are persisted (Prisma JSON) or returned (DTOs).
   - Assert any pipeline / construction / persistence failure produces **no** DB row.
6. **Classification / error mapping (required):**
   - **Oversize + clean file:** **201** bundle; oversize appears in `exclusions` as `unscannable_content`; clean file appears in `entries`; oversize was not read (no clean bytes); public secret-scan still matches this classification.
   - **Sole candidate oversize:** **422** `unsafe_context_bundle`; counts only (`candidatePathCount`, `findingCount`, `unscannableCount`); **no** bundle row.
   - **Total-byte overflow:** propagated **422** `secret_scan_limit_exceeded`; **no** bundle row.
   - **Shared-pipeline timeout:** propagated **422** `secret_scan_timeout`; **no** bundle row.
   - **Injected hash / token / canonicalization / `manifestHash` failure:** **500** `context_bundle_failed`; **no** bundle row.
   - **Prisma transaction failure:** **500** `context_bundle_failed`; **no** partial row.
   - **Type guards:** reject removed `context_bundle_limit_exceeded`, `context_bundle_timeout`, and `context_bundle_entry_unreadable` as `ContextBundleBlockedCode` / blocked DTO members; accept only `SecretScanBlockedCode` members; enforce conditional unsafe counts.
7. **API/integration:** clean eligible tree → **201** with persisted row (algorithm ids present), GET by id **200**, recreate with unchanged material → new UUID + **same** `manifestHash` (two rows allowed); planted secret → scan block propagated, **no** row; unknown project **404**; invalid stage **422**; invalid latest `limit` → **422** `invalid_context_bundle_query` (not blocked-union); public secret-scan endpoint behavior regression remains green.
8. **Web:** idle/loading/success/blocked; hash/token/algorithm id fields visible; no content fetch; no `contentTransmitted`; display caps honored.
9. Quality gates must `PASS`; do not weaken `scripts/scan-secrets.py`.
10. Capture evidence under this change’s `evidence/`.

Integration fixtures SHOULD use temporary directories with minimal `.specpilot/project.yaml` and small file trees.

### D13 — Security, privacy, observability

- Shared pipeline reads each candidate **once**; clean bytes stay in-process for the request only and feed detectors + hash + line/token without a second open.
- Never persist, log, or return file bodies, decoded text, matched secrets, snippets, or absolute paths beyond existing messaging style.
- Log project id, stage, bundle id, `manifestHash`, algorithm ids, counts, error `code`; do not log full entry path lists at info when large; never log file contents or byte lengths that reveal secret payloads.
- No `contentTransmitted` field; no disclosure approval recorded on `ContextBundle`.
- Reuse Compose authorized read-only host root—no new mount policy.
- No authentication change; no repository mutation; no Git subprocesses.
- Keep SpecPilot CI secret scanner independent and unweakened.
- Public secret-scan API MUST continue to omit clean-byte material.

### D14 — Relationship to later Wave 2 slices

| Later slice | Consumes this slice as |
|---|---|
| `w02-s04` | Immutable bundle `id` + `manifestHash` + entries for operator preview/approval before disclosure. Approval / transmission MUST create a **separate related audit aggregate/record**. **`w02-s04` MUST NOT mutate `ContextBundle`** to mark approval or transmission. |
| Wave 3+ review runs | Bind `ReviewRun` to `contextBundleId` + `manifestHash` for evidence; transmission audit remains separate |

This slice MUST NOT implement content preview, approval, provider submission, or the future transmission audit model “early.”

### D15 — Docs and lifecycle

Update `docs/context/**` and package summary if dependencies/schema change. Document operator create/get flow, same-bytes pipeline, algorithm ids, and that token estimates are local Unicode code-point approximations. Sync/archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [`/4` Unicode code-point token estimates diverge from DeepSeek billing] → Documented approximation; Wave 3 budget reconciles actuals; revisit tokenizer only with evidence.
- [Full-file ranges over-disclose vs minimal-context ideal] → Accepted for this slice; section reduction deferred; preview/approval (`w02-s04`) still gates transmission via a separate audit record.
- [Holding clean bytes in memory during the request] → Request-scoped only; never leave process via DTO/DB/log; discard after response; bounds cap total bytes read.
- [TOCTOU if scan-then-reopen were used] → Eliminated by D2 same-bytes single-open pipeline; tests spy single open and mutation-after-read.
- [Refactoring w02-s02 internals to share the engine] → Allowed narrowly; public scan contract locked by regression tests; do not reopen scan product scope.
- [Operators expecting file preview or transmission state on the bundle] → UI copy + Non-Goals; hashes/tokens/paths/algorithm ids only; no `contentTransmitted`.
- [Append-only history growth / duplicate manifestHash rows] → Accepted; no unique constraint; index by project/stage/createdAt; pruning is later-wave ops scope.
- [Including exclusions in manifestHash couples digest to finding set] → Intentional: full safe-manifest identity; changing exclusions must change the hash.
- [Scope creep into preview/DeepSeek/budget] → Explicit Non-Goals; tasks reject those surfaces.
- [JSON entry payload size] → Inherit shared-engine bounds (≤50 MiB read, path counts from resolve); fail closed on exceed.

## Migration Plan

1. Refactor secret-scan internals to a shared same-bytes pipeline; keep public secret-scan HTTP behavior unchanged (regression coverage).
2. Add Prisma `ContextBundle` model (algorithm ids; **no** `contentTransmitted`) + migration; wire `Project.contextBundles` reverse relation.
3. Add shared-contracts DTOs (algorithm ids; no `contentTransmitted`), blocked-code unions, type guards, and `context_bundle_failed` / `context_bundle_not_found` on `ProjectErrorResponse`.
4. Implement pure hash/line/token/`manifestHash` helpers + `ContextBundleService` create/read/latest (shared engine → in-memory manifest → single transactional insert).
5. Add `POST /projects/:id/context-bundles`, `GET .../:bundleId`, and latest `GET ...?stage=&limit=1`. No update/delete routes.
6. Extend Angular console with create/latest actions and outcomes (Spanish-first; algorithm ids; display caps; no transmission UI).
7. Add unit + Testcontainers + web tests covering D12 (including same-bytes spies and manifestHash matrix); write `evidence/` artifacts with safe fixtures.
8. Run `npm run quality-gates`; update docs/context and package summary as needed.
9. Operator-approved commit/push on `main` after reported validations.
10. Operator-approved Verify exactly `PASS`, sync, archive.

**Rollback:** revert slice commits on `main`; roll back or reset **only** the local SpecPilot DB/volume (drop `context_bundles` / migrate down as documented); never touch foreign Docker resources (e.g. `axioma-db-dev`).

## Open Questions

None blocking for APPLY_READY. Token-estimator parity with DeepSeek may be revisited in `w03` budget work with deterministic evidence—not as deferred acceptance criteria for this slice.
