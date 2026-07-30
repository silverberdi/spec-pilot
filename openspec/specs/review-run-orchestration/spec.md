# review-run-orchestration

## Purpose

Persist and execute project-scoped review-run orchestration with fail-closed lifecycle, approved-context transmission through DeepSeek, and safe metadata outcomes for SpecPilot operators.

## Requirements

### Requirement: Accept explicit review-run create requests without latest-bundle substitution
The system SHALL expose `POST /projects/:id/review-runs` accepting body exactly `{ stage: ReviewStage; contextBundleId: string; changeId?: string }` where `ReviewStage` is `new` | `planning` | `applied` | `verify`. Extra or unknown fields MUST return HTTP 422 `invalid_review_run_request` with no run row. `contextBundleId` MUST be required and non-empty for every stage. The server MUST NEVER select latest bundle implicitly and MUST NEVER recreate a bundle. Stage `new` MUST reject any present `changeId` with HTTP 422 `invalid_review_run_request`. Stages `planning` | `applied` | `verify` MUST require `changeId` matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` with length ≤ 120; otherwise HTTP 422 `invalid_review_run_request`. Invalid `stage` MUST return HTTP 422 `invalid_review_run_request`. Unknown project MUST return HTTP 404.

#### Scenario: New stage without changeId is accepted for validation shape
- **WHEN** create is posted with `stage` `new`, a non-empty `contextBundleId`, and no `changeId`
- **THEN** the request is not rejected as `invalid_review_run_request` for changeId rules

#### Scenario: New stage with changeId is rejected
- **WHEN** create is posted with `stage` `new` and any `changeId`
- **THEN** the response is HTTP 422 `invalid_review_run_request` and no `ReviewRun` row is created

#### Scenario: Planning without changeId is rejected
- **WHEN** create is posted with `stage` `planning` and no `changeId`
- **THEN** the response is HTTP 422 `invalid_review_run_request` and no run row is created

#### Scenario: Extra fields are rejected
- **WHEN** create is posted with any field other than `stage`, `contextBundleId`, and optional `changeId`
- **THEN** the response is HTTP 422 `invalid_review_run_request` and no run row is created

#### Scenario: Server never substitutes latest bundle
- **WHEN** create is posted with an explicit `contextBundleId`
- **THEN** the orchestrator loads that id and MUST NOT replace it with the newest bundle for the stage
### Requirement: Execute review runs synchronously and return terminal HTTP 201 outcomes
`POST /projects/:id/review-runs` MUST create and execute the run inside the same HTTP request and return the terminal run DTO. HTTP 201 MUST be returned when a terminal run row is persisted for `completed`, `blocked`, or `failed` (including safe `blockedCode` or `failedCode`). HTTP 422 MUST be used for invalid requests without a run row. HTTP 409 `review_run_in_progress` MUST be used for non-stale in-flight conflicts without creating a new run. Unexpected failure before a run row can be persisted MUST map to HTTP 500. No update, delete, or cancel product endpoints SHALL be exposed.

#### Scenario: Completed create returns 201
- **WHEN** orchestration reaches terminal `completed`
- **THEN** the response is HTTP 201 with `state` `completed` and safe success fields

#### Scenario: Blocked create returns 201 with blockedCode
- **WHEN** orchestration reaches terminal `blocked` after a run row exists
- **THEN** the response is HTTP 201 with `state` `blocked` and a closed `blockedCode`

#### Scenario: Failed create returns 201 with failedCode
- **WHEN** orchestration reaches terminal `failed` after a run row exists
- **THEN** the response is HTTP 201 with `state` `failed` and a closed `failedCode`
### Requirement: Persist ReviewRunTransition history atomically with state changes
The system SHALL persist append-only `ReviewRunTransition` rows with `id`, `reviewRunId`, nullable `fromState`, `toState`, nullable `code`, and `createdAt`. The initial transition MUST be `null → requested`. Every state change MUST insert a transition. The `ReviewRun` state update and transition insert MUST occur in one Prisma transaction. Terminal states MUST be immutable. Invalid transitions MUST map to `failed` with `review_run_invalid_transition` when persistence remains possible. No update/delete product endpoints SHALL exist for transitions. `GET /projects/:id/review-runs/:runId` MUST include `transitions` ordered by `createdAt ASC`, `id ASC`. List items MUST NOT embed full transition arrays and MAY include `transitionCount` only.

#### Scenario: Initial transition is null to requested
- **WHEN** a run is created
- **THEN** exactly one transition exists with `fromState` null and `toState` `requested`

#### Scenario: State and transition are atomic
- **WHEN** the run advances from `requested` to `preparing_context`
- **THEN** the updated `ReviewRun.state` and the new transition row are committed in the same transaction

#### Scenario: Terminal state rejects further transitions
- **WHEN** a run is already `completed`, `blocked`, or `failed`
- **THEN** no further state transition is persisted
### Requirement: Enforce preparing-context with approved excerpt reconstruction before provider call
While in `preparing_context`, the system MUST load the explicit `ContextBundle` for the route project, require `bundle.projectId` equals the route project id, require `bundle.stage` equals request `stage`, resolve covering disclosure approval per the coverage requirement, safely reread every bundle entry, verify exact `contentHash`, reconstruct exact selected line ranges using the existing canonical extraction helper, recompute `previewIntegrityHash` using the approved `previewPolicyId`, require equality with `approval.previewIntegrityHash`, and only then build a bounded provider payload from those exact excerpts. There MUST be no second unverified content source, no client-supplied excerpts/paths/ranges/prompts/schemas/messages/bodies, no automatic bundle recreation, no silent latest-bundle use, no partial provider payload, and no target-repository writes. Integrity failure MUST terminal-block with `review_context_integrity_mismatch`, zero DeepSeek attempts, and zero transmission rows. Over-limit MUST terminal-block with `review_context_limit_exceeded` with zero provider attempts and zero transmission rows. Bounds MUST reuse disclosure preview per-entry (≤ 50000 code points) and total (≤ 200000 code points) excerpt limits and safe-read byte/time bounds, with no truncation. Missing bundle for the project MUST block with `review_context_bundle_required`. Stage mismatch MUST block with `review_context_bundle_stage_mismatch`. Wave 2 aggregates MUST NOT be mutated and `approval.contentTransmitted` MUST remain false.

#### Scenario: Mutate after approval blocks before provider
- **WHEN** live file bytes change after approval so recomputed `previewIntegrityHash` differs
- **THEN** the run ends `blocked` with `review_context_integrity_mismatch`, zero DeepSeek attempts occur, and no transmission row exists

#### Scenario: Bundle stage mismatch blocks
- **WHEN** the explicit bundle exists but `bundle.stage` differs from request `stage`
- **THEN** the run ends `blocked` with `review_context_bundle_stage_mismatch` and zero DeepSeek attempts occur

#### Scenario: Approved excerpts reach the gateway in exact order
- **WHEN** preparing-context succeeds and the gateway is invoked with a fake port
- **THEN** the outbound bounded context items contain the reconstructed excerpts for every selected entry in bundle order with matching `path`, `contentHash`, and `lineRanges`
### Requirement: Distinguish missing approval from policy mismatch during coverage lookup
Coverage lookup MUST: (1) search the most recent `decision = approved` disclosure row matching bundle material/config identity excluding `previewPolicyId` and `approvalPolicyId` (exact equality of `projectId`, `stage`, `manifestHash`, `sourceHash`, `manifestSchemaVersion`, `selectionPolicyId`, `tokenEstimatorId`) ordered by `createdAt DESC`, `id DESC`; (2) if none exists, block with `review_disclosure_approval_required`; (3) if one exists but either policy id differs from current constants `bounded-selected-text-v1` / `explicit-disclosure-approval-v1`, block with `review_disclosure_policy_mismatch`; (4) if the full fingerprint matches including both policy ids, continue with `previewIntegrityHash` revalidation. Policy mismatch MUST NOT be silently treated as missing approval.

#### Scenario: Missing covering approval uses approval_required
- **WHEN** no approved disclosure row matches material identity excluding policy ids
- **THEN** the run ends `blocked` with `review_disclosure_approval_required` and zero DeepSeek attempts occur

#### Scenario: Policy mismatch uses distinct code
- **WHEN** an approved material-matching row exists but `previewPolicyId` or `approvalPolicyId` differs from current constants
- **THEN** the run ends `blocked` with `review_disclosure_policy_mismatch` and zero DeepSeek attempts occur
### Requirement: Pass budget_check as not_enforced only
The success path MUST transition `preparing_context → budget_check` and persist `budgetCheckStatus` exactly `not_enforced` before advancing to `running`. The system MUST NOT estimate, reserve, reconcile, or hard-block monthly budget, MUST NOT infer approved/reserved/affordable/within-budget, and MUST NOT introduce budget tables or budget codes in this capability.

#### Scenario: Budget check records not_enforced
- **WHEN** a run advances through `budget_check` on the success path
- **THEN** `budgetCheckStatus` is `not_enforced` and no budget ledger row is written
### Requirement: Invoke DeepSeek through review_run_orchestration profile with schema review-run-orchestration-v1
After `budget_check`, the system MUST set `promptTemplateId` to `review-run-orchestration-v1`, resolve models with stage `new` → `review.models.discovery` and other stages → `review.models.<stage>`, and invoke the existing DeepSeek gateway port using outbound profile `review_run_orchestration` with `max_tokens` 1024 and the same temperature/stream/response_format/thinking constants as the probe profile except for the orchestration schema and server-built bounded context payload. Public DTOs and Angular MUST NOT supply prompts, messages, tools, temperature, keys, base URL, schema, or content. Local schema `review-run-orchestration-v1` MUST be `{ ok: true; schema: 'review-run-orchestration-v1'; stage: ReviewStage; verdict: string; rationale: string }` with non-empty rationale ≤ 500 characters and stage-valid verdicts: `new` → `ready_to_create` | `blocked` | `changes_required`; `planning` → `apply_ready` | `changes_required` | `blocked`; `applied` → `ready_for_verify` | `changes_required` | `blocked`; `verify` → `ready_for_sync` | `changes_required` | `blocked`. Unresolved model before provider call MUST block with `review_model_unresolved`.

#### Scenario: Completed run stores stage-valid verdict
- **WHEN** gateway returns ok parsed content with matching stage and a stage-valid verdict
- **THEN** the run ends `completed` with that `verdict` and safe `rationale` only

#### Scenario: Invalid verdict fails closed
- **WHEN** gateway returns ok content whose verdict is not stage-valid
- **THEN** the run ends `failed` with `review_verdict_invalid`
### Requirement: Map discriminated gateway results to transmission and failed/completed outcomes
The orchestrator MUST consume `DeepseekStructuredExecutionResult` from the gateway. When `status` is `failed` and `invocationBegan` is false, the system MUST create no transmission row, transition the run to `failed` with `failedCode` equal to the gateway code, and preserve zero-attempt metadata when fields allow. When `status` is `failed` and `invocationBegan` is true, the system MUST insert exactly one `ContextDisclosureTransmission` with `outcome` `provider_failed` for transport/auth/rate/timeout/provider-status failures or `response_invalid` for envelope/empty/truncation/JSON/schema/model failures, set `terminalCode` to the gateway code, and transition the run to `failed`. When `status` is `ok`, the system MUST insert a transmission row as part of final validation: later stage/verdict/rationale failure MUST set transmission `outcome` `response_invalid` and `terminalCode` `review_schema_invalid` or `review_verdict_invalid` with run `failed`; full success MUST set transmission `outcome` `completed` and transition `validating_response → completed`. Missing key, auth, outage, and invalid provider responses MUST be classified as `failed`, not `blocked`. Provider invocation MUST NOT be retried automatically when the post-provider persistence transaction fails; a second DeepSeek request MUST NOT be issued.

#### Scenario: Missing key yields no transmission
- **WHEN** the gateway returns failed with `invocationBegan` false and `attemptCount` 0 for missing key
- **THEN** no transmission row exists and the run is `failed` with the gateway code

#### Scenario: Network failure after outbound start records provider_failed transmission
- **WHEN** the gateway returns failed with `invocationBegan` true for a transport failure
- **THEN** exactly one transmission row exists with `outcome` `provider_failed`

#### Scenario: Post-provider Prisma failure does not call DeepSeek twice
- **WHEN** the gateway has returned and the transaction that records transmission/state fails
- **THEN** the gateway is not invoked a second time for that create
### Requirement: Persist append-only ContextDisclosureTransmission without circular ReviewRun FK
The system SHALL persist append-only `ContextDisclosureTransmission` rows with safe metadata only (`id`, `projectId`, `reviewRunId`, `contextBundleId`, `disclosureApprovalId`, `previewSessionId`, `manifestHash`, `previewIntegrityHash`, `previewPolicyId`, `approvalPolicyId`, `promptTemplateId`, `schemaId`, `requestedModelAlias`, nullable `resolvedModelId`, `outcome`, nullable attempt/latency/usage/providerRequestId/`terminalCode`, `createdAt`). `reviewRunId` MUST be a UNIQUE FK to `ReviewRun` and the only scalar FK linking transmission to run. `ReviewRun` MUST NOT contain scalar `transmissionId`. Prisma MAY expose inverse optional `ReviewRun.transmission`. The system MUST NOT update `ReviewRun` after insert solely to store a back-FK. Rows MUST NOT store excerpts, prompts, messages, request bodies, raw responses, reasoning, API keys, or secrets. Prerequisite/integrity blocks before invocation MUST create zero transmission rows. At most one transmission row per run MUST exist when invocation began. No update/delete product endpoints SHALL exist. No unique/idempotent upsert based on `manifestHash` SHALL be used.

#### Scenario: ReviewRun has no transmissionId column
- **WHEN** the Prisma schema is inspected
- **THEN** `ReviewRun` has no scalar `transmissionId` and `ContextDisclosureTransmission.reviewRunId` is unique

#### Scenario: Prerequisite block creates no transmission
- **WHEN** preparing-context blocks for missing approval
- **THEN** zero transmission rows exist for that run

#### Scenario: Completed run has one completed transmission loadable inversely
- **WHEN** a run completes successfully
- **THEN** exactly one transmission with `outcome` `completed` is loadable via `ReviewRun.transmission`
### Requirement: Enforce one in-flight run per project with stale recovery
PostgreSQL MUST enforce at most one non-terminal run per project via partial unique index on `project_id` WHERE `state` IN (`requested`, `preparing_context`, `budget_check`, `running`, `validating_response`). Unique violation MUST map to HTTP 409 `review_run_in_progress` without a new run row. At the beginning of create, if a non-terminal run exists with `updatedAt` newer than `staleRunTtlMs` 180000, the system MUST return HTTP 409 `review_run_in_progress`. If stale, the system MUST atomically transition that run to `failed`, insert a transition with code `review_run_interrupted`, release the index slot, then create the new run—without replaying or issuing a second provider call for the stale run. Recovery MUST be create-triggered only (no worker/startup reconciler required in this capability). `cancelled` MAY exist in the enum but MUST be unreachable with no cancel endpoint.

#### Scenario: Non-stale in-flight conflicts with 409
- **WHEN** create is posted while another non-terminal run for the project has `updatedAt` within 180000 ms
- **THEN** the response is HTTP 409 `review_run_in_progress` and no new run row is created

#### Scenario: Stale run is interrupted then new run proceeds
- **WHEN** create is posted and the only in-flight run is older than 180000 ms
- **THEN** that run becomes `failed` with transition code `review_run_interrupted` and a new run may be created

#### Scenario: Partial unique index is authoritative
- **WHEN** two concurrent creates race for the same project
- **THEN** at most one non-terminal run remains and the loser maps to `review_run_in_progress`
### Requirement: Expose get and list review-run APIs with safe DTOs
The system SHALL expose `GET /projects/:id/review-runs/:runId` and `GET /projects/:id/review-runs?stage?&limit?`. Get MUST return 404 `review_run_not_found` for missing/wrong project. Get MUST include transitions and MAY include safe transmission metadata via the inverse relation. List MUST default `limit` 20, max 50, order `createdAt DESC`, `id DESC`, return empty array for no rows, MUST NOT embed full transmission objects, and MAY include `hasTransmission` and/or `transmissionOutcome`. DTOs, logs, and evidence MUST exclude excerpts, prompts, raw provider bodies, reasoning, API keys, and secrets.

#### Scenario: Empty list returns 200 array
- **WHEN** list is requested for a project with no runs
- **THEN** the response is HTTP 200 with an empty array

#### Scenario: Get missing run returns 404
- **WHEN** get is requested for an unknown run id under a valid project
- **THEN** the response is HTTP 404 `review_run_not_found`
### Requirement: Classify blocked versus failed with closed codes
Terminal `blocked` MUST use only: `review_context_bundle_required`, `review_context_bundle_stage_mismatch`, `review_disclosure_approval_required`, `review_disclosure_policy_mismatch`, `review_context_integrity_mismatch`, `review_context_limit_exceeded`, `review_model_unresolved`, and `review_run_in_progress` (also for HTTP 409 without new run). Terminal `failed` MUST include `review_run_invalid_transition`, `review_run_interrupted`, `review_schema_invalid`, `review_verdict_invalid`, `review_run_failed`, DeepSeek gateway codes after execution begins (including missing key/auth/outage/invalid provider response), and persistence/infrastructure failures as applicable. `blocked` is allowed only from `requested` | `preparing_context` | `budget_check`. `failed` is allowed from those states plus `running` | `validating_response`. Success sequence MUST be `null → requested → preparing_context → budget_check → running → validating_response → completed`.

#### Scenario: Provider outage is failed not blocked
- **WHEN** the gateway returns a provider-unavailable failure after invocation began
- **THEN** the run state is `failed` and not `blocked`

#### Scenario: Integrity mismatch is blocked
- **WHEN** `previewIntegrityHash` revalidation fails before provider call
- **THEN** the run state is `blocked` with `review_context_integrity_mismatch`
