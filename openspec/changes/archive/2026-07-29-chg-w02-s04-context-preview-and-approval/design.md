## Context

Wave `w02-s01` … `w02-s03` are archived: SpecPilot can resolve stage-scoped candidates, fail-closed secret-scan them, and persist immutable `ContextBundle` manifests (`id`, `manifestHash`, entries with `path` / `contentHash` / `lineRanges` / `tokenEstimate`, exclusions, algorithm ids). Bundle create/get/latest remain metadata-only—no file bodies, no disclosure approval, no `contentTransmitted` on the immutable row.

Slice `w02-s04-context-preview-and-approval` closes Wave 2 secure context assembly by letting the operator **preview** the exact disclosable selected ranges for a chosen bundle and **approve** disclosure before a first or policy-changing run. Preview and approval are a **mandatory sequenced gate**: approval cannot be created from `manifestHash` alone; it MUST bind to a successful, unexpired, metadata-only preview session whose integrity digest still matches a mandatory live re-check. Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding. This slice does **not** transmit payloads to DeepSeek, create review runs, or mutate `ContextBundle`.

## Goals / Non-Goals

**Goals:**

- Preview disclosable content for a registered project's immutable `ContextBundle` by verifying live file bytes against each entry `contentHash`, constructing canonical bounded excerpts, persisting a metadata-only `ContextDisclosurePreviewSession`, and returning ephemeral excerpts plus session identity.
- Require explicit disclosure approval before first or policy-changing runs, bound to `previewSessionId` + `manifestHash` + `decision: 'approved'`, using a separate append-only `ContextDisclosureApproval` audit aggregate that records policy ids, `previewIntegrityHash`, and `contentTransmitted: false` (literal false snapshot; never true in this slice).
- Version preview and approval behavior behind binding policy ids; coverage requires exact equality including both policy ids.
- Never mutate, update, or delete `ContextBundle` or preview-session rows to record approval or transmission.
- Fail closed when the bundle is missing, preview fails/partial, session is missing/expired/mismatched, integrity checks fail, bounds are exceeded, or the request is otherwise unsafe—**no** preview session on failed preview; **no** approval row on failed approval.
- Remain read-only toward target repositories; no DeepSeek / external transmission; no Git/OpenSpec/delivery execution from SpecPilot.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for preview and approval outcomes (success, empty, blocked, loading, error), distinct from resolve / secret-scan / bundle-create.
- Deliver deterministic automated evidence for success (preview session → approval) and the blocked/failure matrix in D11; keep quality gates green without weakening repo-level secret scanning.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- DeepSeek product API calls, provider payload transmission, or setting `contentTransmitted` to `true`.
- Review runs, findings ledger as product evidence, budget reservation/enforcement, prompts.
- Mutating `ContextBundle` (no product update/delete; no approval/transmission columns on the bundle).
- Mutating or deleting preview sessions after insert (no product update/delete).
- Intelligent section reduction beyond the ranges already stored on the bundle (`full-file-lines-v1` continues until a later slice changes selection policy).
- Expanding `schemaVersion: 1` or changing portable `project.yaml` context patterns.
- Editing target repositories; executing delivery/Git write/OpenSpec workflows from SpecPilot.
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Weakening SpecPilot repo-level `baseline-validation-and-secret-scanning` / quality gates to pass fixtures.
- Persisting excerpts, file bodies, decoded text, raw bytes, secret values, or absolute host paths in PostgreSQL (preview session or approval).
- Reject/revoke UX; client-supplied excerpts, paths, ranges, or file bodies.
- Editing OpenSpec-generated integrations except via `openspec update`.

## Decisions

### D0 — Binding policy constants

```ts
const PREVIEW_POLICY_ID = 'bounded-selected-text-v1';
const APPROVAL_POLICY_ID = 'explicit-disclosure-approval-v1';
```

- Persist `previewPolicyId` on every `ContextDisclosurePreviewSession`.
- Persist both `previewPolicyId` and `approvalPolicyId` on every `ContextDisclosureApproval`.
- Return both policy ids on status and approval DTOs; show both in the Spanish-first UI.
- Changing either constant requires a new preview and a new approval before coverage can hold.

### D1 — Metadata-only preview session (binding)

Successful preview persists an append-only **`ContextDisclosurePreviewSession`** (table `context_disclosure_preview_sessions`) **only after** every entry passes integrity validation **and** the complete bounded preview has been constructed successfully. Failed or partial preview creates **no** session.

**Persist:**

| Field | Type / notes |
|---|---|
| `id` | UUID PK |
| `projectId` | FK → `Project`, cascade delete |
| `contextBundleId` | FK → `ContextBundle` (project ownership cascade is enough; bundles are never product-deleted) |
| `stage` | copied from bundle |
| `configurationVersionId` | copied from bundle |
| `sourceHash` | copied from bundle |
| `manifestSchemaVersion` | copied from bundle |
| `selectionPolicyId` | copied from bundle |
| `tokenEstimatorId` | copied from bundle |
| `manifestHash` | copied from bundle |
| `previewPolicyId` | always `PREVIEW_POLICY_ID` at insert |
| `previewIntegrityHash` | canonical digest (D5) |
| `itemCount` | number of preview items |
| `previewedCodePointCount` | total Unicode code points across ephemeral excerpts |
| `createdAt` | DateTime |
| `expiresAt` | `createdAt + 15 minutes` exactly |

**Do not persist:** excerpts, file bodies, decoded text, raw bytes, secret values, absolute host paths.

**Invariants:**

- TTL is exactly **15 minutes** (`expiresAt = createdAt + 15 * 60 * 1000` ms).
- Append-only; **no** update/delete product endpoints for preview sessions.
- Response includes `previewSessionId`, `previewPolicyId`, `previewIntegrityHash`, `createdAt`, `expiresAt`, plus ephemeral preview items.
- Index: `(projectId, contextBundleId, createdAt)`; unique PK on `id`.

- *Alternative considered:* approve from `manifestHash` alone without a session. Rejected — operator must have completed a successful preview; session is the durable proof.
- *Alternative considered:* persist excerpts for replay. Rejected — minimal disclosure / privacy; metadata + integrity hash only.
- *Alternative considered:* longer/shorter TTL. Rejected — 15 minutes is the binding operator window for this slice.

### D2 — Separate disclosure approval aggregate (binding)

**Model:** `ContextDisclosureApproval` (table `context_disclosure_approvals`).

| Field | Type / notes |
|---|---|
| `id` | UUID PK |
| `projectId` | FK → `Project`, cascade delete |
| `contextBundleId` | FK → `ContextBundle` |
| `previewSessionId` | **FK** → `ContextDisclosurePreviewSession.id` (Restrict on session delete; sessions are not product-deleted). Immutable snapshot via FK—do **not** use a loose string without relation. |
| `stage` | copied from bundle / session |
| `configurationVersionId` | copied |
| `sourceHash` | copied |
| `manifestSchemaVersion` | copied |
| `selectionPolicyId` | copied |
| `tokenEstimatorId` | copied |
| `manifestHash` | copied |
| `previewPolicyId` | from session / `PREVIEW_POLICY_ID` |
| `approvalPolicyId` | always `APPROVAL_POLICY_ID` at insert |
| `previewIntegrityHash` | must equal session (and re-check) |
| `decision` | `'approved'` only |
| `contentTransmitted` | **boolean literal `false` snapshot**; never updated |
| `createdAt` | DateTime |

**Invariants:**

- Append-only: each successful approve inserts a **new** row; no update/delete product endpoints.
- Multiple approval rows per preview session are **allowed**; no unique constraint; no idempotent upsert. Latest covering approval governs status.
- Never mutate `ContextBundle` or preview sessions on approve.
- `ContextBundle` MUST NOT gain approval, decision, or `contentTransmitted` columns.
- Bundle ok DTOs and preview-session DTOs **forbid** `contentTransmitted`.
- Indexes: `(projectId, stage, createdAt)`; `contextBundleId`; `previewSessionId` (FK index).

**`contentTransmitted` semantics (binding):**

- Present on `ContextDisclosureApproval` as a literal `false` snapshot at insert.
- It never changes; approval means **disclosure-ready**, not transmitted.
- Wave 3 MUST create a **separate transmission event** aggregate rather than updating this column or any approval row.
- Forbidden on `ContextBundle` and preview-session DTOs/responses.

- *Alternative considered:* string snapshot of `previewSessionId` without FK. Rejected — FK enforces referential integrity for the mandatory preview→approval link.
- *Alternative considered:* one approval per session (unique). Rejected — append-only history; latest covering row governs.
- *Alternative considered:* omit `contentTransmitted` until Wave 3. Kept as literal false snapshot so audit shape matches context-and-privacy (“whether content was transmitted”) without implying transmission occurred.

### D3 — First vs policy-changing coverage (binding)

An approval **covers** a candidate bundle when a prior `ContextDisclosureApproval` row exists with `decision === 'approved'` and **exact equality** of all of:

- `projectId`
- `stage`
- `manifestHash`
- `sourceHash`
- `manifestSchemaVersion`
- `selectionPolicyId`
- `tokenEstimatorId`
- `previewPolicyId`
- `approvalPolicyId`

against the candidate bundle’s identity fields plus the **current** `PREVIEW_POLICY_ID` and `APPROVAL_POLICY_ID`.

**First run:** no covering approval for that fingerprint.

**Policy-changing run:** prior approval exists for the project+stage, but any coverage field differs—including a change to `previewPolicyId` or `approvalPolicyId`—so a **new preview and new approval** are required.

| `approvalRequired` | Meaning |
|---|---|
| `true` | First or policy-changing; operator must preview then approve |
| `false` | A covering approval already exists for this fingerprint |

Same `manifestHash` on a new UUID bundle row remains coverable by material identity when all coverage fields match. Different material or either policy id → re-preview + re-approve.

- *Alternative considered:* coverage without policy ids. Rejected — versioned policies must invalidate prior approvals.
- *Alternative considered:* cover by `contextBundleId` only. Rejected — identical recreated material should remain coverable via `manifestHash` + fingerprint.

### D4 — Canonical preview extraction (binding)

Open/read/`contentHash` verification remains mandatory before extraction.

After bytes are verified:

1. Decode with **fatal UTF-8** (invalid UTF-8 → fail closed; no session).
2. **Do not** normalize CRLF to LF (or any other newline normalization).
3. Use `text.split('\n')` **only** to map 1-based inclusive line ranges to segments (same split semantics as w02-s03 line counting). Carriage returns that appear inside segments are preserved as ordinary characters.
4. **Current full-file single range** (`full-file-lines-v1`, typically one range covering the whole file):  
   `excerpt` MUST equal the **complete decoded text exactly**, including every existing `\n` and `\r` character. Do not rebuild the file by joining split lines (that would drop or alter CR/LF). When the stored range is the full-file single range for a non-empty file, return the decoded text as-is.
5. **Empty file:** `lineRanges: []` → `excerpt = ''`.
6. **Multiple ranges** (DTO-supported):  
   - Validate ranges are ascending, non-overlapping, and inside the decoded line count (`startLine >= 1`, `endLine >= startLine`, `endLine <= lineCount`, strictly increasing non-overlapping order).  
   - Extract each requested segment from the split line array (joining lines within a range with `'\n'` to reconstruct that segment’s interior newlines from split—**except** when applying the full-file single-range rule in step 4).  
   - For multi-range extraction specifically: concatenate segments in range order using exactly one `'\n'` separator between non-contiguous ranges; do **not** add a separator before the first or after the last segment.  
   - **Clarification for full-file:** prefer step 4 (exact decoded text) whenever there is exactly one range that covers lines `1..lineCount` on a non-empty file, so CRLF and trailing newlines are bit-exact with the decoded buffer.
7. **Invalid, overlapping, reversed, or out-of-bounds** persisted ranges → **422** `disclosure_preview_integrity_mismatch`; no partial response; no preview session.

- *Alternative considered:* always join split lines for full-file. Rejected — would destroy CR characters and alter trailing-newline fidelity; full-file must be exact decoded text.
- *Alternative considered:* normalize newlines for “stable” excerpts. Rejected — disclosure must show what would be sent.

### D5 — Canonical `previewIntegrityHash` (binding)

`previewIntegrityHash` is lowercase SHA-256 over **compact canonical JSON** (UTF-8 bytes of `JSON.stringify` with no added whitespace) built from plain objects in **exact binding key order**:

```ts
{
  previewPolicyId: 'bounded-selected-text-v1',
  projectId: string,
  contextBundleId: string,
  manifestHash: string,
  items: Array<{
    path: string,
    contentHash: string,
    lineRanges: Array<{ startLine: number, endLine: number }>,
    excerptHash: string, // sha-256 hex lowercase of exact UTF-8 bytes of ephemeral excerpt
  }>,
}
```

**Rules:**

- `items` preserve `ContextBundle` entry order.
- Each item key order: `path`, `contentHash`, `lineRanges`, `excerptHash`.
- Each line-range key order: `startLine`, `endLine`.
- `excerptHash` digests the ephemeral excerpt bytes; excerpts themselves are **not** part of any persisted JSON column.
- `createdAt`, `expiresAt`, and `previewSessionId` are **excluded** from the hash.
- Re-running preview against identical live content and the same `previewPolicyId` yields the same `previewIntegrityHash`.

### D6 — Preview flow (binding)

**`POST /projects/:id/context-bundles/:bundleId/preview`**

Body: `{}` or absent. No client paths, excerpts, ranges, hashes, or file bodies.

Algorithm:

1. Resolve project; load `ContextBundle` by `{ id: bundleId, projectId }`. Missing → **404** `context_bundle_not_found`.
2. For each entry in bundle order: path-escape checks, open/`O_NOFOLLOW`, read within D8 bounds, verify `contentHash`, canonical extract (D4). Any failure → corresponding 422/500; **no session**.
3. Enforce excerpt code-point bounds (D8). Exceeded → **422** `disclosure_preview_limit_exceeded`; **no session**.
4. Compute `previewIntegrityHash` (D5).
5. Insert `ContextDisclosurePreviewSession` with `expiresAt = createdAt + 15m`, `previewPolicyId = PREVIEW_POLICY_ID`, metadata only.
6. Return **200** ok DTO including `previewSessionId`, `previewPolicyId`, `previewIntegrityHash`, `createdAt`, `expiresAt`, `approvalRequired`, ephemeral `items[]` with excerpts.
7. Discard bytes/excerpts from process memory after response construction (excerpts exist only in the HTTP response).

Empty bundle (`entryCount === 0`): construct empty items, hash over empty `items` array, still create a session, return ok with `items: []`.

Do **not** re-run secret detectors when hashes match.

### D7 — Approval flow (binding; preview mandatory)

**`POST /projects/:id/context-bundles/:bundleId/disclosure-approvals`**

Request body (**exact**):

```ts
{
  previewSessionId: string;
  manifestHash: string;
  decision: 'approved';
}
```

**Mandatory algorithm** (integrity re-check is **not** optional):

1. Load bundle by `{ id: bundleId, projectId }`. Missing → **404** `context_bundle_not_found`.
2. If `previewSessionId` missing/invalid shape → **422** `disclosure_preview_required`.
3. Load preview session by `{ id: previewSessionId, projectId, contextBundleId: bundleId }`. Not found → **422** `disclosure_preview_required`.
4. If `now >= session.expiresAt` → **422** `disclosure_preview_expired`.
5. If `body.decision !== 'approved'` → **422** `invalid_disclosure_approval`.
6. If `body.manifestHash !== bundle.manifestHash` → **422** `disclosure_manifest_mismatch`.
7. If session identity does not match the bundle (`manifestHash`, `sourceHash`, `configurationVersionId`, `manifestSchemaVersion`, `selectionPolicyId`, `tokenEstimatorId`, `stage`) **or** `session.manifestHash !== body.manifestHash` → **422** `disclosure_preview_binding_mismatch`.
8. If `session.previewPolicyId !== PREVIEW_POLICY_ID` → **422** `disclosure_preview_policy_mismatch`.
9. **Mandatory full integrity re-check:** re-open/read/verify every entry `contentHash` and rebuild canonical excerpts (D4) under the same bounds; compute a new `previewIntegrityHash` (D5). On content/range failure → **422** `disclosure_preview_integrity_mismatch` (or unreadable/limit/timeout codes per D8/D9). **No approval row.**
10. If recomputed `previewIntegrityHash !== session.previewIntegrityHash` → **422** `disclosure_preview_integrity_mismatch`. **No approval row.**
11. Insert `ContextDisclosureApproval` with FK `previewSessionId`, both policy ids, `previewIntegrityHash`, `decision: 'approved'`, `contentTransmitted: false`.
12. Return **201** approval ok DTO (includes both policy ids, `contentTransmitted: false`, `approvalRequired: false`; **no** file bodies/excerpts).

**`GET .../context-bundles/:bundleId/disclosure-status`**

- Load bundle; compute coverage (D3); return status including `previewPolicyId`, `approvalPolicyId` (current constants), `approvalRequired`, `coveringApprovalId | null`, and `contentTransmitted: false` (always false this slice; never imply transmission).

**`GET .../disclosure-approvals?stage=&limit=1`**

- Require `stage` and `limit=1`; return 0..1 most recent approvals for project+stage ordered by `createdAt DESC, id ASC`.

No reject/revoke product endpoints.

### D8 — Preview bounds (binding)

| Bound | Value | Failure |
|---|---|---|
| Per-file read | `1048576` (1 MiB) | **422** `disclosure_preview_entry_unreadable` |
| Total bytes read across entries | `52428800` (50 MiB) | **422** `disclosure_preview_limit_exceeded` |
| Preview / approve re-check wall time | `30000` ms | **422** `disclosure_preview_timeout` |
| Total excerpt Unicode code points | `200000` | **422** `disclosure_preview_limit_exceeded` |
| Per-entry excerpt code points | `50000` | **422** `disclosure_preview_limit_exceeded` (no silent truncate) |

UI display caps (UI-only):

- Show at most **20** preview entries with excerpts.
- When `itemCount > 20`, copy equivalent to `Mostrando 20 de N entradas`.

### D9 — Error code mapping (non-overlapping, binding)

| Code | HTTP | When (exclusive) |
|---|---|---|
| `disclosure_preview_required` | 422 | Missing/invalid `previewSessionId`, or no session for `id+projectId+contextBundleId` |
| `disclosure_preview_expired` | 422 | Session found but `now >= expiresAt` |
| `disclosure_preview_binding_mismatch` | 422 | Session found and not expired, but session↔bundle identity mismatch or `session.manifestHash !== body.manifestHash` (after body has been checked against bundle separately when applicable) |
| `disclosure_manifest_mismatch` | 422 | `body.manifestHash !== bundle.manifestHash` |
| `disclosure_preview_policy_mismatch` | 422 | `session.previewPolicyId !== PREVIEW_POLICY_ID` |
| `disclosure_preview_integrity_mismatch` | 422 | Live `contentHash` ≠ entry; invalid/overlapping/out-of-bounds ranges; or recomputed `previewIntegrityHash` ≠ session |
| `disclosure_preview_entry_unreadable` | 422 | Missing/symlink/EACCES/oversize/non-regular during preview or approve re-check |
| `disclosure_preview_limit_exceeded` | 422 | Byte or excerpt code-point bounds |
| `disclosure_preview_timeout` | 422 | Wall clock exceeded |
| `invalid_disclosure_approval` | 422 | Bad `decision` / body shape (other than missing session id) |
| `invalid_disclosure_approval_query` | 422 | Latest query missing `stage` or `limit≠1` |
| `disclosure_preview_failed` | 500 | Unexpected preview construction/persistence failure |
| `disclosure_approval_failed` | 500 | Unexpected approve persistence failure |

Reuse `context_path_escape` (422) for path-escape during reads.

**Ordering for approve checks** (to keep codes non-overlapping): required → load session → expired → decision → manifest mismatch (body vs bundle) → binding mismatch → policy mismatch → integrity re-check / integrity mismatch → insert.

Do **not** use a separate `disclosure_integrity_mismatch` code—integrity failures use `disclosure_preview_integrity_mismatch`.

### D10 — Module / API / UI surface

| Component | Responsibility |
|---|---|
| `ContextDisclosureService` (new) | preview (+ session insert), status, approve (+ mandatory re-check), latest |
| `ContextBundleService` (existing) | unchanged create/get/latest; **no** approval/preview writes |
| Pure helpers (new) | canonical extract (D4); `previewIntegrityHash` (D5); coverage fingerprint (D3) |
| Prisma | additive preview-session + approval models/relations; **immutable** `ContextBundle` |

**Routes (unchanged paths; binding contracts updated):**

```ts
POST /projects/:id/context-bundles/:bundleId/preview
POST /projects/:id/context-bundles/:bundleId/disclosure-approvals
GET  /projects/:id/context-bundles/:bundleId/disclosure-status
GET  /projects/:id/disclosure-approvals?stage=&limit=1
```

No endpoint may accept excerpts, paths, ranges, hashes other than the binding `manifestHash`, or file bodies from the client.

**Preview ok DTO (sketch):**

```ts
{
  status: 'ok';
  previewSessionId: string;
  previewPolicyId: 'bounded-selected-text-v1';
  approvalPolicyId: 'explicit-disclosure-approval-v1'; // current constant, for UI
  previewIntegrityHash: string;
  createdAt: string;
  expiresAt: string;
  bundleId: string;
  projectId: string;
  stage: ReviewStage;
  manifestHash: string;
  selectionPolicyId: string;
  tokenEstimatorId: string;
  manifestSchemaVersion: 1;
  itemCount: number;
  previewedCodePointCount: number;
  totalTokenEstimate: number;
  approvalRequired: boolean;
  items: Array<{
    path: string;
    contentHash: string;
    lineRanges: Array<{ startLine: number; endLine: number }>;
    tokenEstimate: number;
    excerpt: string; // ephemeral only
  }>;
}
```

**Approval ok DTO (sketch):**

```ts
{
  status: 'ok';
  id: string;
  projectId: string;
  contextBundleId: string;
  previewSessionId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  manifestSchemaVersion: 1;
  selectionPolicyId: string;
  tokenEstimatorId: string;
  manifestHash: string;
  previewPolicyId: 'bounded-selected-text-v1';
  approvalPolicyId: 'explicit-disclosure-approval-v1';
  previewIntegrityHash: string;
  decision: 'approved';
  contentTransmitted: false;
  createdAt: string;
  approvalRequired: false;
}
```

**Spanish-first UI:**

- Actions: **Vista previa**, **Aprobar divulgación**, status/latest as needed—distinct from resolve / secret-scan / create manifesto.
- Show `previewPolicyId` and `approvalPolicyId` on success surfaces.
- Preview success: session id prefix, expiry, integrity hash prefix, `approvalRequired`, ≤20 excerpts.
- Approval success: approval id prefix, both policy ids, `contentTransmitted: no`, `approvalRequired: false`.
- Copy: approval does **not** send content to DeepSeek; preview expires in 15 minutes.
- No send-to-provider controls.

### D11 — Test strategy (binding matrix)

Automated coverage MUST include:

1. **Success:** create bundle → preview creates session + excerpts → status `approvalRequired: true` → approve with `previewSessionId` → status `approvalRequired: false` → latest shows approval with `contentTransmitted: false` and both policy ids.
2. Approval without `previewSessionId` → `disclosure_preview_required`; no approval row.
3. Expired preview → `disclosure_preview_expired`; no approval row.
4. Session for another bundle/project → `disclosure_preview_binding_mismatch`; no approval row.
5. Session whose `previewPolicyId` ≠ current `PREVIEW_POLICY_ID` → `disclosure_preview_policy_mismatch`; no approval row.
6. Mutate file after preview before approve → `disclosure_preview_integrity_mismatch`; no approval row.
7. Unchanged file → approval succeeds.
8. Coverage invalidates when `previewPolicyId` or `approvalPolicyId` would change (fingerprint mismatch → `approvalRequired: true`).
9. Full-file excerpt preserves original CRLF/text exactly.
10. Multiple-range canonical extraction (separator rules).
11. Invalid persisted ranges block with `disclosure_preview_integrity_mismatch`; no session.
12. `previewIntegrityHash` stable for identical material/policy; changed excerpt changes hash.
13. Preview session row stores no excerpt/body/raw bytes (assert DB columns / JSON payload).
14. Failed preview creates no session.
15. Failed approval creates no approval row.
16. Immutability: after approve, `ContextBundle` unchanged; no `contentTransmitted` on bundle or preview-session DTOs.
17. Web: idle/loading/success/blocked for preview and approval; Spanish copy; 20-entry cap; both policy ids visible.

Contract guards: approval ok requires `contentTransmitted === false`; bundle/preview DTOs reject `contentTransmitted`.

### D12 — Security, privacy, observability

- Preview returns selected-range text only for hash-verified entries; never secret match values, detector payloads, or absolute host paths.
- Sessions and approvals never persist excerpts/bodies.
- Logs: project id, bundle id, preview session id, approval id, policy ids, `manifestHash`, `previewIntegrityHash`, counts, error `code`—**not** excerpts or file contents.
- No auth change; no repository mutation; no Git subprocesses; no provider calls.
- Keep SpecPilot CI secret scanner independent and unweakened.
- Evidence fixtures: temporary dirs, synthetic non-secret text only.

### D13 — Relationship to later waves

| Later work | Consumes this slice as |
|---|---|
| Wave 3+ review runs | Require covering approval (`approvalRequired: false`) for the bound fingerprint before provider submission; on actual send, insert a **separate transmission event**—MUST NOT update `contentTransmitted` on historical approval rows |
| Budget / prompts | Out of scope |

### D14 — Docs and lifecycle

Update `docs/context/**` and package summary if schema/deps change. Document: preview session TTL 15m, mandatory preview→approval binding, policy ids, approval ≠ transmission. Sync/archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [Approve without having previewed] → Mitigated by mandatory `previewSessionId` + session load + expiry + integrity re-check.
- [TOCTOU between preview and approve] → Mandatory re-check + `previewIntegrityHash` equality; mutate-after-preview fails closed.
- [CRLF / newline fidelity] → Full-file excerpt = exact decoded text; no CRLF→LF normalization.
- [Large excerpts] → Hard code-point bounds; UI 20-entry cap; fail closed, no truncate.
- [Operators confuse approve with DeepSeek send] → Spanish copy; `contentTransmitted` always false; no send controls.
- [Preview session / approval table growth] → Accepted; indexed latest queries; pruning is later-wave ops.
- [Domain model text still says ContextBundle includes disclosure decision] → Superseded: disclosure lives on preview session + approval aggregates; update docs/context on apply.
- [Empty bundles] → Empty preview session + approval allowed for path consistency; Wave 3 decides run eligibility.
- [Integrity re-check cost] → Accepted; bounded by D8.

## Migration Plan

1. Add Prisma `ContextDisclosurePreviewSession` and `ContextDisclosureApproval` (+ FKs/indexes/relations); **do not** alter `ContextBundle` columns.
2. Add shared-contracts DTOs, error codes (D9), type guards (policy ids; `contentTransmitted === false` on approval; forbidden on bundle/preview session).
3. Implement canonical extract + `previewIntegrityHash` helpers; `ContextDisclosureService` (preview session insert, status, approve with mandatory re-check, latest).
4. Add controller routes; map errors via `project-errors.ts` + Spanish operator messages.
5. Extend Angular console (preview→approve sequencing, TTL copy, both policy ids, caps, no DeepSeek send).
6. Add unit + Testcontainers + web tests per D11; write `evidence/` with safe fixtures.
7. Update `docs/context/**` / package-summary as needed.
8. Report validations; operator gates for commit / Verify `PASS` / sync / archive.

**Rollback:** revert API/UI/contracts; roll back/reset only local SpecPilot DB/volume (`context_disclosure_preview_sessions`, `context_disclosure_approvals`); never touch foreign Docker resources or target repositories.

## Open Questions

None blocking. Deferred intentionally:

- Wave 3 transmission event shape (separate aggregate—required direction already fixed).
- Whether empty-bundle approvals may authorize review runs (Wave 3 product rule).
- Reject/revoke UX (not required to close Wave 2).
- Background expiry sweeper for old preview sessions (not required; expiry is enforced on read).
