## Context

Archived `w03-s01` delivered a project-scoped DeepSeek probe gateway (`DeepseekGatewayPort.completeStructured`, `POST /projects/:id/deepseek/probe`) with fail-closed envelope validation, deterministic retries, and Spanish-first probe UI. Probe outcomes remain ephemeral and MUST stay unchanged by this slice.

Wave 2 already provides immutable `ContextBundle` rows, append-only disclosure preview/approval aggregates, canonical `extractExcerpt` / `computePreviewIntegrityHash` helpers, and coverage fingerprint equality. Architecture defines `ReviewRun` lifecycle states and stage-valid verdicts, but no application code persists or executes them.

Slice `w03-s02-review-run-orchestration` persists and executes that state machine **and transmits approved reconstructed context** to DeepSeek through the gateway, while recording append-only transmission and transition evidence. Stakeholders: SpecPilot operator (run console); Cursor (sole implementer). Main-only working policy remains binding. ADR-004 still forbids target-repo edits and delivery execution; DeepSeek calls remain allowed.

This design revision closes: real approved-context transmission, explicit `contextBundleId` create identity, full disclosure fingerprint + `previewIntegrityHash` revalidation, append-only `ContextDisclosureTransmission` and `ReviewRunTransition`, PostgreSQL partial-unique concurrency, stale-run recovery, **non-circular ReviewRun↔Transmission linkage**, and a **discriminated internal gateway execution result**—before specs are authored.

## Goals / Non-Goals

**Goals:**

- Persist `ReviewRun`, append-only `ReviewRunTransition`, and append-only `ContextDisclosureTransmission` via an additive Prisma migration owned by `apps/api`.
- Execute a fail-closed lifecycle with atomic state+transition writes and terminal immutability.
- Accept an **explicit** create body (`stage`, required `contextBundleId`, optional/required `changeId` by stage rules)—never silently select latest bundle.
- Reconstruct approved excerpts from the named bundle using Wave 2 helpers, revalidate `previewIntegrityHash`, then build a bounded provider payload and invoke DeepSeek through a generalized gateway profile.
- Persist safe transmission metadata for every logical gateway invocation that began; never persist excerpts, prompts, raw responses, reasoning, API keys, or secrets.
- Pass through `budget_check` with `budgetCheckStatus = not_enforced` only (`w03-s03` owns enforcement).
- Enforce at most one non-terminal run per project with a **PostgreSQL partial unique index**; recover stale in-flight runs on next create (`staleRunTtlMs = 180000`).
- Expose project-scoped create/get/list APIs and a Spanish-first Angular surface with success/blocked/empty/loading/error.
- Deliver deterministic automated evidence covering the binding test matrix in D17.

**Non-Goals:**

- Monthly budget estimate/reserve/reconcile/hard-block (`w03-s03`).
- Findings ledger, consolidated prompts, or run-history product surfaces (`w03-s04`).
- Mutating `ContextBundle`, `ContextDisclosurePreviewSession`, or `ContextDisclosureApproval` (including never setting `contentTransmitted` to `true`).
- Automatic bundle recreation; client-supplied excerpts/paths/ranges/prompts/schemas/messages/bodies.
- Stage-depth analysis product logic owned by Waves 4–7.
- Separate `apps/worker` deployable, SSE progress streams, cancel/resume endpoints, or startup reconciler (recovery is create-triggered only).
- Providers other than DeepSeek; auth/multiuser; Windows/Linux; target-repo writes; delivery/Git/OpenSpec apply-verify-sync-archive from SpecPilot.
- Weakening SpecPilot repo-level secret scanning / quality gates; editing OpenSpec-generated integrations except via `openspec update`.
- Changing `proposal.md` in this update.

## Decisions

### D0 — Binding constants

| Constant | Value |
|---|---|
| Aggregate | `ReviewRun` |
| Stages | `ReviewStage`: `new` \| `planning` \| `applied` \| `verify` |
| Lifecycle states | `requested`, `preparing_context`, `budget_check`, `running`, `validating_response`, `completed`, `blocked`, `failed`, `cancelled` |
| Terminal states | `completed`, `blocked`, `failed`, `cancelled` (immutable) |
| In-flight (partial-index) states | `requested`, `preparing_context`, `budget_check`, `running`, `validating_response` |
| Orchestration schema id | `review-run-orchestration-v1` |
| Prompt template id | `review-run-orchestration-v1` |
| Gateway outbound profile | `review_run_orchestration` (distinct from probe) |
| `max_tokens` (orchestration) | `1024` |
| `temperature` / `stream` / `response_format` / `thinking` | `0` / `false` / `json_object` / `disabled` |
| Max provider response body | `65536` bytes |
| Retries / timeouts | reuse gateway binding (`maxAttempts` 3, delays 500/1000, timeout 30s, Retry-After cap 2000) |
| Budget check result this slice | `not_enforced` (literal) |
| Model key for stage `new` | `review.models.discovery` |
| Model keys for other stages | `review.models.<stage>` |
| `changeId` max length | `120` |
| `changeId` regex | `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| List default / max | `limit` default `20`, max `50` |
| Concurrent in-flight | at most one non-terminal run per `projectId` (DB-enforced) |
| `staleRunTtlMs` | `180000` |
| Preview policy id (reuse) | `bounded-selected-text-v1` |
| Approval policy id (reuse) | `explicit-disclosure-approval-v1` |
| Excerpt bounds (reuse Wave 2) | per-entry ≤ `50000` code points; total ≤ `200000` code points; per-file read ≤ `1048576` bytes; total bytes ≤ `52428800`; wall ≤ `30000` ms; **no truncation** |

### D1 — Module boundary (modular monolith)

New Nest module `ReviewRunsModule` under `apps/api/src/app/review-runs/`:

- Owns orchestration service, transition helpers, transmission persistence, and project-scoped routes (dedicated controller preferred).
- Depends on: `PrismaModule`, exported `DEEPSEEK_GATEWAY_PORT` from `DeepseekModule`, Wave 2 read helpers (`extractExcerpt`, `computePreviewIntegrityHash`, safe file read/hash verify), Project / ContextBundle / ContextDisclosureApproval reads.
- **Must not** bypass the gateway with ad-hoc HTTP.
- **Must not** mutate Wave 2 aggregates.
- No separate worker process in this slice.

*Alternative considered:* identity-only DeepSeek payload. **Rejected** — this slice transmits reconstructed approved excerpts (D4–D5).

*Alternative considered:* orchestration inside `DeepseekModule`. Rejected — gateway remains provider transport; orchestration is a distinct bounded context.

### D2 — Synchronous create-and-execute

`POST /projects/:id/review-runs` performs stale recovery (D8), creates a row in `requested` with an initial transition, then advances the machine **inside the same HTTP request**, persisting each transition atomically with state updates. The HTTP response is the **terminal** run DTO.

*Alternative considered:* async job + SSE. Rejected for this slice.
*Alternative considered:* create-only + separate execute. Rejected.

### D3 — Explicit create request (no latest substitution)

**Request body (exact):**

```ts
{
  stage: ReviewStage;
  contextBundleId: string;
  changeId?: string;
}
```

**Rules (binding):**

- Reject unknown / extra fields → HTTP `422` `invalid_review_run_request` (**no** run row).
- `contextBundleId` is **required**, non-empty string, for **every** stage.
- Server **never** selects latest bundle implicitly and **never** recreates a bundle.
- After load: `bundle.projectId` MUST equal route project id; else treat as missing for this project → preparing_context `blocked` with `review_context_bundle_required` (after run row exists) or equivalent fail-closed path that never invokes the provider.
- `bundle.stage` MUST equal request `stage`; else `blocked` `review_context_bundle_stage_mismatch`.
- Stage `new`: `changeId` MUST be absent; if present → `422` `invalid_review_run_request` (no run row).
- Stages `planning` | `applied` | `verify`: `changeId` REQUIRED, non-empty, length ≤ `120`, matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`; else `422` `invalid_review_run_request`.
- Invalid stage → `422` `invalid_review_run_request`.

### D4 — Binding transmission pipeline

Exact success pipeline before/through provider:

1. Load project and active configuration.
2. Load **explicit** `ContextBundle` by `contextBundleId` + project.
3. Verify bundle belongs to project and `bundle.stage === request.stage`.
4. Resolve covering disclosure approval using the binding lookup order in D5 (material identity first, then policy distinction, then full fingerprint).
5. Safely reread every bundle entry; verify exact `contentHash`.
6. Reconstruct exact selected line ranges via existing canonical `extractExcerpt`.
7. Recompute `previewIntegrityHash` using the approved `previewPolicyId` / Wave 2 canonical hash helper.
8. Require equality with covering `approval.previewIntegrityHash`.
9. Build **bounded** provider payload from those exact excerpts (all-or-nothing; no truncation).
10. Invoke DeepSeek gateway (`review_run_orchestration` profile) and receive `DeepseekStructuredExecutionResult` (D6).
11. Validate `review-run-orchestration-v1` when status is `ok`.
12. Persist terminal result per D7 transmission mapping (no `ReviewRun.transmissionId` scalar).

**Hard rules:**

- No second unverified content source.
- No client-supplied excerpts, paths, ranges, prompts, schemas, messages, or bodies.
- No automatic bundle recreation; no silent latest-bundle use.
- Integrity failure → terminal `blocked` `review_context_integrity_mismatch`, **zero** DeepSeek attempts, **zero** transmission rows.
- Over-limit → terminal `blocked` `review_context_limit_exceeded`, zero provider attempts, zero transmission rows.
- No partial provider payload.
- No target repository writes.
- No raw content in logs, Prisma, evidence, or DTOs.

### D5 — Full disclosure coverage and integrity

**Binding lookup order** (do not collapse policy mismatch into missing approval):

1. Search for the most recent disclosure row with `decision = 'approved'` matching bundle **material/config identity excluding** `previewPolicyId` and `approvalPolicyId` — i.e. exact equality of:
   - `projectId`
   - `stage`
   - `manifestHash`
   - `sourceHash`
   - `manifestSchemaVersion`
   - `selectionPolicyId`
   - `tokenEstimatorId`
   Ordered by `createdAt DESC`, `id DESC`.
2. If **none** exists → terminal `blocked` `review_disclosure_approval_required` (zero provider attempts, zero transmission rows).
3. If one exists but either `previewPolicyId` or `approvalPolicyId` differs from current binding constants (`bounded-selected-text-v1` / `explicit-disclosure-approval-v1`) → terminal `blocked` `review_disclosure_policy_mismatch` (zero provider attempts, zero transmission rows).
4. If the **full fingerprint** matches (material identity **plus** both policy ids and `decision = approved`) → continue with `previewIntegrityHash` revalidation.

Before transmission: reconstruct preview material, recompute `previewIntegrityHash`, compare to `approval.previewIntegrityHash`. Mismatch → `blocked` `review_context_integrity_mismatch` as in D4.

**Never** mutate `ContextBundle`, `ContextDisclosurePreviewSession`, or `ContextDisclosureApproval`. **Never** set `approval.contentTransmitted` to `true`.

### D6 — Bounded provider payload and discriminated gateway result

`promptTemplateId = 'review-run-orchestration-v1'` (versioned local prompt identity).

Gateway request profile contains **only** trusted server-built fields:

- `stage`
- optional `changeId`
- `promptTemplateId`
- `schemaId` (`review-run-orchestration-v1`)
- bounded context items derived from the approved bundle

Each context item:

```ts
{
  path: string;
  contentHash: string;
  lineRanges: ReadonlyArray<{ startLine: number; endLine: number }>;
  excerpt: string;
}
```

Bounds: reuse disclosure preview per-entry and total excerpt code-point bounds and safe-read byte/time bounds (D0). Reject over-limit **before** provider call with `review_context_limit_exceeded`. Provider payload MUST contain **all** selected material or fail closed—**no truncation**.

The gateway owns the fixed system/user message template that embeds these trusted fields and demands JSON matching the orchestration schema. Public DTOs and Angular **cannot** supply prompts/messages/tools/temperature/keys/base URL/schema/content.

Extend `DeepseekGatewayPort` with outbound profile:

- `probe` — unchanged synthetic probe + `deepseek-gateway-probe-v1`.
- `review_run_orchestration` — server-built bounded context payload + orchestration schema validation path; `max_tokens = 1024`.

Envelope validation order, retries, and secret-safety reuse `w03-s01` bindings; local schema for orchestration profile is `review-run-orchestration-v1`.

**Internal discriminated result (binding semantics; names may match existing architecture):**

```ts
type DeepseekStructuredExecutionResult =
  | {
      status: 'ok';
      invocationBegan: true;
      requestedModelAlias: string;
      resolvedModelId: string;
      attemptCount: number;
      latencyMs: number;
      providerHttpStatus: number;
      providerRequestId?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
      parsed: unknown;
    }
  | {
      status: 'failed';
      invocationBegan: boolean;
      code: DeepseekGatewayErrorCode;
      requestedModelAlias?: string;
      resolvedModelId?: string;
      attemptCount: number;
      latencyMs: number;
      providerHttpStatus?: number;
      providerRequestId?: string;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };
```

**Result rules:**

- MUST NOT include API key, Authorization, prompts, context excerpts, raw request body, raw provider response, `reasoning_content`, headers collection, stack, or provider message body.
- `invocationBegan = false` only when the gateway fails **before** the first outbound HTTP attempt (missing key; unresolved model/config before adapter call; invalid internal request before network).
- `invocationBegan = true` once the first outbound attempt starts (network failure, timeout, 4xx/5xx, retry exhaustion, invalid envelope, empty/truncated response, invalid JSON, schema mismatch, model mismatch).
- `attemptCount = 0` when `invocationBegan` is false; `attemptCount >= 1` when true.
- `latencyMs` is total operation wall-clock including retries/backoff.
- `providerHttpStatus` present only when an HTTP response was received.
- `providerRequestId` only the existing documented safe request-id header value.
- `usage` only when safely parsed from a valid provider envelope.
- Public probe behavior and public probe DTO remain unchanged; the probe service maps this internal result to the existing probe response/error contract.

### D7 — Append-only `ContextDisclosureTransmission` (non-circular FK)

Additive Prisma model (safe metadata only):

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `projectId` | FK → Project |
| `reviewRunId` | FK → ReviewRun; **UNIQUE** (at most one transmission per run in this slice) |
| `contextBundleId` | FK → ContextBundle |
| `disclosureApprovalId` | FK → ContextDisclosureApproval |
| `previewSessionId` | FK → ContextDisclosurePreviewSession (prefer Restrict, matching Wave 2 approval style) |
| `manifestHash` | string |
| `previewIntegrityHash` | string |
| `previewPolicyId` | string |
| `approvalPolicyId` | string |
| `promptTemplateId` | string |
| `schemaId` | string |
| `requestedModelAlias` | string |
| `resolvedModelId` | nullable string |
| `outcome` | `completed` \| `provider_failed` \| `response_invalid` |
| `attemptCount` | nullable int |
| `latencyMs` | nullable int |
| `promptTokens` / `completionTokens` / `totalTokens` | nullable |
| `providerRequestId` | nullable safe header value only |
| `terminalCode` | nullable closed code |
| `createdAt` | timestamp |

**Relationship binding:**

- `ContextDisclosureTransmission.reviewRunId` is the **only** scalar FK linking transmission → run.
- `ReviewRun` MUST **not** contain a scalar `transmissionId` column.
- Prisma MAY expose inverse optional `ReviewRun.transmission ContextDisclosureTransmission?` derived from `reviewRunId`.
- MUST NOT require updating `ReviewRun` after inserting transmission solely to store a back-FK.
- No unique/idempotent upsert based on `manifestHash`.
- Append-only; no update/delete product endpoints.
- Zero transmission rows when blocked before provider invocation.
- Exactly one transmission row when the logical gateway invocation began (`invocationBegan: true`), after all retries finish.
- Never mutate `approval.contentTransmitted`.
- Concurrent/double insertion violating unique `reviewRunId` MUST fail closed.

**Orchestrator mapping of `DeepseekStructuredExecutionResult`:**

**A. `status: 'failed'` + `invocationBegan: false`**

- No `ContextDisclosureTransmission` row.
- Transition run to `failed`; `failedCode` = gateway `code`.
- Preserve zero-attempt safe metadata on `ReviewRun` when fields allow (`attemptCount = 0`, `latencyMs`, optional alias fields).

**B. `status: 'failed'` + `invocationBegan: true`**

- Insert exactly one transmission row with:
  - `outcome = provider_failed` for transport/auth/rate/timeout/provider-status failures;
  - `outcome = response_invalid` for envelope/empty/truncation/JSON/schema/model failures;
  - safe metadata from the gateway result;
  - `terminalCode` = gateway `code`.
- Transition run to `failed` with the same safe code.
- No raw content persisted.

**C. `status: 'ok'`**

- Insert the transmission row as part of the success/final-validation flow (same transaction as run state when possible).
- If orchestration stage/verdict/rationale validation later fails:
  - transmission `outcome = response_invalid`;
  - `terminalCode = review_schema_invalid` or `review_verdict_invalid`;
  - run transitions to `failed`.
- If all validation succeeds:
  - transmission `outcome = completed`;
  - run transitions `validating_response → completed`.

**Post-provider persistence boundary:**

- Transmission insert and the corresponding run metadata/state transition MUST occur in **one Prisma transaction** whenever possible.
- If provider invocation occurred but the transaction that records transmission/state fails:
  - map to safe local infrastructure failure (`review_run_failed` / HTTP 500 as applicable);
  - **do not** retry the provider invocation automatically;
  - **do not** issue a second DeepSeek request;
  - log only safe run/project/code metadata;
  - acknowledge externally that transmission may have occurred without durable local evidence (see Risks).
- Tests MUST prove a simulated post-provider Prisma failure does not invoke the gateway a second time.

**API DTO decision:** `GET /projects/:id/review-runs/:runId` MAY include safe transmission metadata via Prisma `include` of the inverse relation (no excerpts/prompts/bodies). List MUST NOT include the full transmission object; list items MAY include `hasTransmission: boolean` and/or `transmissionOutcome` when explicitly selected.
### D8 — Append-only `ReviewRunTransition` and atomicity

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `reviewRunId` | FK → ReviewRun, Cascade |
| `fromState` | nullable string (`null` for initial) |
| `toState` | string |
| `code` | nullable closed code |
| `createdAt` | timestamp |

**Rules:**

- Initial transition: `null → requested`.
- Every state change inserts a transition.
- `ReviewRun` current-state update and transition insert occur in **one Prisma transaction**.
- Terminal states cannot transition again.
- Invalid transition → `failed` with `review_run_invalid_transition` when persistence is still possible.
- No update/delete product endpoints.

**GET DTO decision:** `GET /projects/:id/review-runs/:runId` MUST include `transitions: ReviewRunTransitionDto[]` ordered by `createdAt ASC`, `id ASC` (closed fields: `id`, `fromState`, `toState`, `code`, `createdAt`). List items MUST NOT embed full transition arrays; they MAY include `transitionCount` only.

### D9 — Database-enforced concurrency + stale recovery

**Partial unique index** (additive migration SQL / Prisma unsupported-features as needed):

```sql
CREATE UNIQUE INDEX review_runs_one_inflight_per_project
ON review_runs (project_id)
WHERE state IN (
  'requested',
  'preparing_context',
  'budget_check',
  'running',
  'validating_response'
);
```

Service MAY pre-check for a friendly path, but the **DB constraint is authoritative**. Unique violation → HTTP `409` `review_run_in_progress` (**no** new run row).

**Interrupted-run recovery** (`staleRunTtlMs = 180000`) at the beginning of create:

1. Locate existing non-terminal run for project.
2. If `updatedAt` is newer than TTL → HTTP `409` `review_run_in_progress` (no new run).
3. If stale → atomically transition it to `failed`, insert `ReviewRunTransition` with code `review_run_interrupted`, release the partial-index slot, then create the new run.
4. No automatic replay and no second provider call for the stale run.

Recovery is triggered **only on the next create** in this slice—no worker/startup reconciler required.

### D10 — State machine (binding)

**Success sequence:**

```
null → requested
requested → preparing_context
preparing_context → budget_check
budget_check → running
running → validating_response
validating_response → completed
```

**`blocked` allowed only from:** `requested`, `preparing_context`, `budget_check`.

**`failed` allowed from:** `requested`, `preparing_context`, `budget_check`, `running`, `validating_response`.

`cancelled` remains in the persisted enum for domain compatibility but is **unreachable** in this slice and has **no** endpoint.

All terminal states are immutable.

### D11 — `budget_check`

Persist transition into `budget_check` and set `budgetCheckStatus = 'not_enforced'`. Advance to `running`.

UI and DTO MUST state budget enforcement is not active. Do **not** infer approved, reserved, affordable, or within-budget. No budget table and no budget code in this slice.

### D12 — Outcome schema and completed criteria

Keep schema `review-run-orchestration-v1` and stage-valid verdicts:

| Stage | Allowed verdicts |
|---|---|
| `new` | `ready_to_create`, `blocked`, `changes_required` |
| `planning` | `apply_ready`, `changes_required`, `blocked` |
| `applied` | `ready_for_verify`, `changes_required`, `blocked` |
| `verify` | `ready_for_sync`, `changes_required`, `blocked` |

```ts
{
  ok: true;
  schema: 'review-run-orchestration-v1';
  stage: ReviewStage; // must equal run.stage
  verdict: string;    // must be stage-valid
  rationale: string;  // non-empty, max 500 chars
}
```

Provider receives **actual approved context** (D4–D6). Gateway returns `DeepseekStructuredExecutionResult`; orchestration maps it per D7.

**Completed requires all of:**

- provider result `status: 'ok'` with `invocationBegan: true`;
- local schema valid;
- response `stage` equals run `stage`;
- verdict belongs to stage-valid set;
- rationale non-empty and ≤ 500;
- exactly one `ContextDisclosureTransmission` row with `outcome = completed` linked by `reviewRunId` (inverse `ReviewRun.transmission`); **no** `ReviewRun.transmissionId` scalar;
- `validating_response → completed` transition persisted.

Persist only `verdict` and safe `rationale` on the run—not raw provider output or reasoning.

Hard architecture invariants that need findings/evidence depth remain deferred to later waves; this slice validates enum membership + schema shape only.

### D13 — Blocked versus failed

**Blocked codes** (terminal `blocked`; prerequisites / policy / concurrency-as-run-outcome where applicable):

- `review_context_bundle_required`
- `review_context_bundle_stage_mismatch`
- `review_disclosure_approval_required`
- `review_disclosure_policy_mismatch`
- `review_context_integrity_mismatch`
- `review_context_limit_exceeded`
- `review_model_unresolved`
- `review_run_in_progress` (also used as HTTP `409` when no new run is created)

**Failed codes** (terminal `failed`):

- `review_run_invalid_transition`
- `review_run_interrupted`
- `review_schema_invalid`
- `review_verdict_invalid`
- `review_run_failed`
- existing DeepSeek configuration/auth/balance/rate/transport/timeout/provider/envelope/schema/model codes **after execution begins** (including missing key / auth / outage / invalid provider response—**not** classified as blocked)
- persistence/infrastructure errors mapped to `review_run_failed` when appropriate

**Request/transport without run row:**

- `invalid_review_run_request` → `422`
- unknown project → `404`
- get missing/wrong project run → `404` `review_run_not_found`
- unexpected failure before a run row can be persisted → `500`

Do **not** classify provider outage, missing key, auth, or invalid provider response as `blocked`.

### D14 — API surface and status codes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/projects/:id/review-runs` | Create + execute; return terminal run DTO |
| `GET` | `/projects/:id/review-runs/:runId` | Get by id including `transitions` and optional safe `transmission` via inverse relation |
| `GET` | `/projects/:id/review-runs?stage?&limit?` | List newest-first; optional stage filter |

**POST status codes:**

| Outcome | HTTP |
|---|---|
| Terminal `completed` run persisted | `201` |
| Terminal `blocked` run persisted | `201` with `state: blocked` and safe `blockedCode` |
| Terminal `failed` run persisted | `201` with `state: failed` and safe `failedCode` |
| Invalid request | `422` without run row |
| Active (non-stale) conflict | `409` without new run row |
| Unknown project | `404` |
| Unexpected failure before run row persisted | `500` |

**GET:** missing/wrong project → `404`.

List: default `limit=20`, max `50`, order `createdAt DESC`, `id DESC`. Empty list → `200` `[]` (UI empty state). List items MUST NOT embed full transmission objects; they MAY include `hasTransmission` and/or `transmissionOutcome`.

No update/delete/cancel endpoints.

### D15 — Prisma `ReviewRun` shape

Additive `review_runs` fields (snake_case maps as usual):

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `projectId` | FK Cascade |
| `configurationVersionId` | active config at start |
| `stage` | `ReviewStage` |
| `changeId` | nullable |
| `state` | lifecycle |
| `contextBundleId` | set from explicit request / preparing_context |
| `manifestHash` | bound bundle hash |
| `disclosureApprovalId` | covering approval |
| `previewSessionId` | from covering approval |
| `previewIntegrityHash` | from covering approval / revalidation |
| `previewPolicyId` / `approvalPolicyId` | bound policy ids |
| `budgetCheckStatus` | `not_enforced` after budget_check |
| `promptTemplateId` | nullable until set before running; then `review-run-orchestration-v1` |
| `modelAlias` / `resolvedModelId` | set when running begins |
| `schemaId` | orchestration schema on success path |
| `verdict` / `rationale` | nullable; set on completed |
| `attemptCount` / `latencyMs` / usage fields | safe gateway metadata |
| `blockedCode` / `failedCode` | nullable |
| `createdAt` / `updatedAt` | `updatedAt` required for stale detection |
| `completedAt` / `blockedAt` / `failedAt` | nullable terminal timestamps |

**Explicit non-field:** `ReviewRun` MUST NOT have scalar `transmissionId`. Optional Prisma inverse relation only:

```ts
transmission ContextDisclosureTransmission?
```

derived from unique `ContextDisclosureTransmission.reviewRunId`.

Add Project reverse relations and indexes including `(projectId, createdAt)`, `(projectId, stage, createdAt)`, the partial unique in-flight index (D9), and **UNIQUE** `context_disclosure_transmissions.review_run_id`.

No finding, budget, prompt-history, auth, or user tables.

### D16 — Angular Spanish-first UI

Show: run id, stage, change id, explicit context bundle id/hash, approval id, current/final state, transitions, optional safe transmission summary (`hasTransmission` / `transmissionOutcome` / included safe transmission metadata—never excerpts), `budgetCheckStatus` `not_enforced` (budget enforcement not active), model alias/id, schema id, `promptTemplateId`, usage/latency, verdict/rationale, `blockedCode`/`failedCode`.

Do **not** show: excerpts, prompt text, provider request, raw response, reasoning, findings, remaining budget, delivery controls.

Inputs: stage, explicit `contextBundleId`, conditional `changeId`. Action: **Iniciar revisión**. States: idle | loading | success | blocked | empty | error.

### D17 — Test strategy (binding matrix)

Required coverage:

- explicit bundle required; server never substitutes latest;
- bundle stage mismatch;
- full approval fingerprint coverage;
- approval missing vs approval policy mismatch produce **different** closed codes (`review_disclosure_approval_required` vs `review_disclosure_policy_mismatch`);
- mutate-after-approval blocks before provider;
- `previewIntegrityHash` revalidation;
- actual approved excerpts reach fake gateway in exact order;
- bounds fail before provider;
- `ReviewRun` has **no** `transmissionId` scalar column;
- `ContextDisclosureTransmission.reviewRunId` is unique; relationship loads inversely from `ReviewRun`;
- prerequisite/integrity block produces no transmission;
- missing key → `invocationBegan: false`, `attemptCount: 0`, no transmission;
- network/timeout/provider error after outbound start → `invocationBegan: true` and `provider_failed` transmission;
- invalid envelope/JSON/schema/model → `response_invalid` transmission;
- stage/verdict mismatch after gateway success → `response_invalid` transmission + failed run;
- completed run → `completed` transmission;
- exactly one transmission per run; concurrent/double insertion violates unique `reviewRunId` and fails closed;
- safe gateway failure metadata contains no body/prompt/excerpt/key/reasoning;
- post-provider Prisma failure never invokes DeepSeek twice;
- approval remains `contentTransmitted` false;
- transition sequence persisted exactly; state+transition atomicity; terminal immutability;
- DB partial unique index concurrency race;
- stale run recovery after `180000` ms; non-stale conflict;
- `new` without `changeId` accepted; `new` with `changeId` rejected;
- `planning`/`applied`/`verify` require valid `changeId`;
- completed/blocked/failed persisted and retrievable;
- no content/prompts/raw response persisted;
- probe behavior remains unchanged.

Live DeepSeek not required for automated gates; human validation may use a real key.

### D18 — Migration and rollback

- Additive Prisma migration for `review_runs`, `review_run_transitions`, `context_disclosure_transmissions`, FKs, indexes, partial unique in-flight index, and **UNIQUE** `context_disclosure_transmissions.review_run_id`.
- No `review_runs.transmission_id` column.
- Deploy: migrate SpecPilot DB volume, restart API/web.
- Rollback: revert module/UI/contracts; roll back additive migration per repo practice; **never** reset foreign volumes (including `axioma-db-dev`).

### D19 — Docs / inventory

Update `docs/context/current-state.md`, file index, and `package-summary.json` during apply—not as a substitute for Verify `PASS`.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Accidental secret/content persistence | Transmission/run DTOs metadata-only; logs exclude excerpts/prompts/bodies (D4/D7/D16) |
| Integrity bypass via stale approval | Mandatory live reread + `previewIntegrityHash` equality before provider (D4/D5) |
| Silent latest-bundle misuse | Required `contextBundleId`; tests forbid substitution (D3/D17) |
| Operators expect budget hard-block | `budgetCheckStatus: not_enforced`; UI copy; no budget codes (D11) |
| Operators expect findings/prompts | Minimal verdict only; `w03-s04` owns ledger (D12) |
| Sync HTTP timeout with real excerpts | Reuse gateway timeouts; fail closed on bounds before call; document operator wait |
| Concurrent double create | Partial unique index + stale recovery (D9) |
| Stuck in-flight after crash | Create-time stale fail with `review_run_interrupted` (D9) |
| Circular FK / double-write of transmission link | Only `ContextDisclosureTransmission.reviewRunId` UNIQUE; no `ReviewRun.transmissionId` (D7/D15) |
| Provider call succeeded but local TX failed | No automatic second DeepSeek call; safe infra failure mapping; Risk accepted that external transmission may lack durable local evidence (D7) |
| Collapsing policy mismatch into missing approval | Explicit two-step lookup order (D5) |
| Probe regression | Profile enum + internal result mapped by probe service; public probe DTO unchanged (D6/D17) |
| Proposal vs design transmission detail | Proposal left unchanged per operator instruction; specs MUST absorb this design’s transmission/evidence rules |

## Open Questions

None blocking. Specs MUST absorb: explicit create body, transmission pipeline, fingerprint coverage with approval-code distinction, integrity revalidation, bounded payload + `promptTemplateId`, discriminated `DeepseekStructuredExecutionResult`, non-circular transmission FK (`reviewRunId` UNIQUE; no `ReviewRun.transmissionId`), orchestrator transmission mapping A/B/C, post-provider TX failure no-retry, `ReviewRunTransition`, partial unique concurrency, stale recovery, blocked/failed code split, API status codes, and the D17 test matrix from this design.
