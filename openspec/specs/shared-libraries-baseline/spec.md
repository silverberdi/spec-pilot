# shared-libraries-baseline

## Purpose

Shared TypeScript library baseline for contracts reusable by web and API without framework coupling.

## Requirements

### Requirement: packages/shared-contracts is the binding shared package
The repository SHALL provide `packages/shared-contracts` as the initial shared TypeScript package for the application baseline. The package MUST be free of Angular and NestJS framework imports so it remains independently usable by web and API.

#### Scenario: Shared contracts package exists independently
- **WHEN** shared libraries are inspected
- **THEN** `packages/shared-contracts` exists and does not import Angular or NestJS

### Requirement: Health contract and minimal runtime validation are exported
`packages/shared-contracts` MUST export the health response TypeScript contract corresponding to `{ "status": "ok", "service": "api" }` and a minimal repository-owned runtime validator or type guard for that contract. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid health payload is accepted
- **WHEN** the shared runtime validator receives `{ "status": "ok", "service": "api" }`
- **THEN** validation succeeds

#### Scenario: Invalid health payload is rejected
- **WHEN** the shared runtime validator receives a payload missing required fields or with invalid values
- **THEN** validation fails and MUST NOT treat the payload as a valid health success contract

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration, project-configuration, discovery, project-dashboard health/list, context-source-resolution, secret-detection-and-exclusion, context-bundle-manifest, context-preview-and-approval, deepseek-api-gateway, and review-run-orchestration request/response and error contracts required by those capabilities without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Review-run contracts may live in shared-contracts
- **WHEN** shared contracts for review-run create/get/list DTOs, lifecycle states, transitions, transmission safe metadata, and closed review-run error codes are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

### Requirement: Project registration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for `RegisterProjectRequest`, `ProjectDto` (including `configurationVersionId: string | null`, `lastInspectedAt: string | null`, and required `discoveryHealth: ProjectDiscoveryHealthDto`), `ProjectDiscoveryHealthDto`, `DiscoveryHealthStatus` (`never_inspected` | `ok` | `blocked` | `invalid`), `ProjectErrorResponse` (`{ code: string; message: string }`), `ProjectConfigurationVersionDto`, binding `RegisterProjectResponse`, discovery contracts required by `git-and-openspec-discovery` including `ProjectDiscoveryDto` with closed Git and OpenSpec discriminated unions, context-source-resolution contracts required by `context-source-resolution` including `ReviewStage` (`new` | `planning` | `applied` | `verify`), `ContextSourceResolveRequest` (`{ stage: ReviewStage }`), `ContextSourceResolveOkDto`, `ContextSourceResolveBlockedDto`, `ContextSourceResolveDto`, and closed `ContextSourceResolveBlockedCode` exactly equal to `invalid_review_stage` | `configuration_not_found` | `invalid_context_patterns` | `context_path_escape` | `context_entry_unreadable` | `context_resolution_limit_exceeded` | `context_resolution_timeout` | `repository_not_found` | `repository_not_directory` | `repository_not_readable`, secret-detection contracts required by `secret-detection-and-exclusion` including `SecretScanRequest` (`{ stage: ReviewStage }`), `SecretDetectorId`, `SecretFindingDto` (`path` + `detectorId` only), `UnscannablePathDto`, `SecretScanOkDto`, `SecretScanBlockedDto`, `SecretScanDto`, and closed scan-specific blocked codes `unsafe_context_bundle` | `secret_scan_limit_exceeded` | `secret_scan_timeout` | `secret_scan_entry_unreadable` unioned with `ContextSourceResolveBlockedCode`, context-bundle contracts required by `context-bundle-manifest` including create request `{ stage: ReviewStage }`, `ContextBundleLineRangeDto`, `ContextBundleEntryDto`, `ContextBundleExclusionDto`, `ContextBundleOkDto` (with `manifestSchemaVersion` `1`, `selectionPolicyId` `full-file-lines-v1`, `tokenEstimatorId` `unicode-codepoints-div-4-v1`, and no `contentTransmitted`), `ContextBundleBlockedDto`, `ContextBundleDto`, latest list wrapper, and `ContextBundleBlockedCode` exactly equal to `SecretScanBlockedCode`, and context-preview-and-approval contracts required by `context-preview-and-approval` including preview ok DTO with `previewSessionId`, `previewPolicyId` `bounded-selected-text-v1`, `approvalPolicyId` `explicit-disclosure-approval-v1`, `previewIntegrityHash`, `createdAt`, `expiresAt`, and ephemeral excerpt items; approval request exactly `{ previewSessionId: string; manifestHash: string; decision: 'approved' }`; approval ok DTO with both policy ids, `previewIntegrityHash`, `contentTransmitted` literal `false`, and `previewSessionId`; disclosure status ok DTO with both policy ids and `approvalRequired`; latest approval list wrapper; plus minimal repository-owned runtime validators or type guards for those contracts. `ProjectErrorResponse.code` MUST allow `context_resolve_failed` for HTTP 500 unexpected resolve failures, `secret_scan_failed` for HTTP 500 unexpected secret-scan failures, `context_bundle_failed` for HTTP 500 unexpected context-bundle construction or persistence failures, `context_bundle_not_found` for HTTP 404 missing bundles, `invalid_context_bundle_query` for HTTP 422 invalid latest-query shapes, `disclosure_preview_failed` for HTTP 500 unexpected preview failures, `disclosure_approval_failed` for HTTP 500 unexpected approval persistence failures, and the closed disclosure 422 codes `disclosure_preview_required` | `disclosure_preview_expired` | `disclosure_preview_binding_mismatch` | `disclosure_manifest_mismatch` | `disclosure_preview_policy_mismatch` | `disclosure_preview_integrity_mismatch` | `disclosure_preview_entry_unreadable` | `disclosure_preview_limit_exceeded` | `disclosure_preview_timeout` | `invalid_disclosure_approval` | `invalid_disclosure_approval_query`. `context_resolve_failed`, `secret_scan_failed`, `context_bundle_failed`, `context_bundle_not_found`, `invalid_context_bundle_query`, `disclosure_preview_failed`, and `disclosure_approval_failed` MUST NOT be members of `ContextBundleBlockedCode`. Type guards MUST reject removed codes `context_bundle_limit_exceeded`, `context_bundle_timeout`, and `context_bundle_entry_unreadable` as blocked-union members. For `SecretScanBlockedDto` and `ContextBundleBlockedDto`, type guards MUST require `candidatePathCount`, `findingCount`, and `unscannableCount` when `code` is `unsafe_context_bundle` and MUST reject those count fields when `code` is any other blocked code. Type guards MUST reject `SecretFindingDto` payloads that include matched values, snippets, offsets, line numbers, or surrounding context fields. Type guards MUST reject `ContextBundleOkDto` payloads that include `contentTransmitted`, file bodies, or decoded text. Type guards MUST require approval ok `contentTransmitted === false` and MUST reject `contentTransmitted` on preview-session identity fields or bundle ok DTOs. `RegisterProjectResponse` MUST remain `ProjectDto & { configuration: { status: 'attached'; version: ProjectConfigurationVersionDto } | { status: 'blocked'; error: ProjectErrorResponse } }`. Git blocked codes MUST be exactly `not_a_git_repository` | `git_inspect_failed` | `git_inspection_timeout`. OpenSpec blocked codes MUST be exactly `openspec_root_missing` | `openspec_inspect_failed` | `openspec_path_escape` | `openspec_inspection_limit_exceeded`. Type guards MUST reject incomplete or ambiguous `configuration` unions, MUST reject unknown discovery blocked codes or ambiguous `git` / `openspec` unions, MUST reject `ProjectDto` payloads missing `discoveryHealth` or using unknown `discoveryHealth.status` / subsystem status values, MUST reject unknown review stages, MUST reject unknown context-source blocked codes, MUST reject ambiguous `ContextSourceResolveDto` shapes, MUST reject unknown secret detector ids, MUST reject unknown secret-scan blocked codes, MUST reject ambiguous `SecretScanDto` shapes, MUST reject unknown context-bundle blocked codes outside `SecretScanBlockedCode`, MUST reject ambiguous `ContextBundleDto` shapes, MUST reject approval requests missing `previewSessionId`, and MUST reject ambiguous disclosure preview/approval DTO shapes. When validating an `attached` response, guards MUST require `configurationVersionId` to equal `version.id`. When validating a `blocked` response, guards MUST require `configurationVersionId` to be `null`. The `displayName` maximum of 120 characters MUST remain enforced by the shared contract/validator surface. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid ProjectDto with discoveryHealth is accepted
- **WHEN** the shared runtime validator receives a well-formed `ProjectDto` including a closed `discoveryHealth` object
- **THEN** validation succeeds

#### Scenario: ProjectDto missing discoveryHealth is rejected
- **WHEN** the shared runtime validator receives a `ProjectDto`-shaped payload without `discoveryHealth`
- **THEN** validation fails and MUST NOT treat the payload as a valid `ProjectDto`

#### Scenario: Unknown discoveryHealth status is rejected
- **WHEN** the shared runtime validator receives `discoveryHealth.status` outside `never_inspected` | `ok` | `blocked` | `invalid`
- **THEN** validation fails

#### Scenario: Valid attached RegisterProjectResponse is accepted
- **WHEN** the shared runtime validator receives a well-formed `RegisterProjectResponse` with `configuration.status` `attached`, a `version`, matching `configurationVersionId`, and `discoveryHealth`
- **THEN** validation succeeds

#### Scenario: Valid blocked RegisterProjectResponse is accepted
- **WHEN** the shared runtime validator receives a well-formed `RegisterProjectResponse` with `configuration.status` `blocked`, an `error`, `configurationVersionId` null, and `discoveryHealth`
- **THEN** validation succeeds

#### Scenario: Ambiguous configuration union is rejected
- **WHEN** the shared runtime validator receives a register response with `configuration.status` `attached` but missing `version`, or `blocked` but missing `error`, or both `version` and `error`
- **THEN** validation fails and MUST NOT treat the payload as a valid `RegisterProjectResponse`

#### Scenario: Valid ProjectDiscoveryDto is accepted
- **WHEN** the shared runtime validator receives a well-formed `ProjectDiscoveryDto` with closed ok or blocked Git and OpenSpec unions
- **THEN** validation succeeds

#### Scenario: Unknown discovery blocked code is rejected
- **WHEN** the shared runtime validator receives a discovery payload with a Git or OpenSpec blocked `code` outside the closed unions
- **THEN** validation fails and MUST NOT treat the payload as a valid `ProjectDiscoveryDto`

#### Scenario: Valid ContextSourceResolveOkDto is accepted
- **WHEN** the shared runtime validator receives a well-formed ok resolve payload with a closed `stage` and sorted `paths`
- **THEN** validation succeeds

#### Scenario: Unknown context-source blocked code is rejected
- **WHEN** the shared runtime validator receives a blocked resolve payload whose `code` is outside the closed `ContextSourceResolveBlockedCode` union or equals `context_resolve_failed`
- **THEN** validation fails and MUST NOT treat the payload as a valid `ContextSourceResolveBlockedDto`

#### Scenario: Unknown review stage is rejected
- **WHEN** the shared runtime validator receives a resolve, secret-scan, or context-bundle request or ok payload with `stage` outside `new` | `planning` | `applied` | `verify`
- **THEN** validation fails

#### Scenario: Valid SecretScanOkDto is accepted
- **WHEN** the shared runtime validator receives a well-formed ok secret-scan payload with closed detector ids and `eligiblePathCount` equal to `eligiblePaths.length`
- **THEN** validation succeeds

#### Scenario: Unsafe block requires safe counts only
- **WHEN** the shared runtime validator receives a blocked secret-scan or context-bundle payload with `code` `unsafe_context_bundle`
- **THEN** validation succeeds only if `candidatePathCount`, `findingCount`, and `unscannableCount` are present, and fails if finding path arrays or match-text fields are included

#### Scenario: Non-unsafe blocked rejects count fields
- **WHEN** the shared runtime validator receives a blocked secret-scan or context-bundle payload with a non-`unsafe_context_bundle` code that includes `candidatePathCount`, `findingCount`, or `unscannableCount`
- **THEN** validation fails

#### Scenario: Finding with snippet fields is rejected
- **WHEN** the shared runtime validator receives a finding object that includes matched value, snippet, offset, or line-number fields
- **THEN** validation fails and MUST NOT treat the payload as a valid `SecretFindingDto`

#### Scenario: Unknown secret-scan blocked code is rejected
- **WHEN** the shared runtime validator receives a blocked secret-scan payload whose `code` is outside the closed secret-scan blocked union or equals `secret_scan_failed`
- **THEN** validation fails and MUST NOT treat the payload as a valid `SecretScanBlockedDto`

#### Scenario: Valid ContextBundleOkDto is accepted
- **WHEN** the shared runtime validator receives a well-formed ok context-bundle payload with algorithm ids, matching counts, and no `contentTransmitted`
- **THEN** validation succeeds

#### Scenario: Removed context-bundle blocked codes are rejected
- **WHEN** the shared runtime validator receives a blocked context-bundle payload whose `code` is `context_bundle_limit_exceeded`, `context_bundle_timeout`, or `context_bundle_entry_unreadable`
- **THEN** validation fails and MUST NOT treat the payload as a valid `ContextBundleBlockedDto`

#### Scenario: Valid disclosure approval ok requires contentTransmitted false
- **WHEN** the shared runtime validator receives a well-formed disclosure approval ok payload with both policy ids and `contentTransmitted` false
- **THEN** validation succeeds

#### Scenario: Disclosure approval with contentTransmitted true is rejected
- **WHEN** the shared runtime validator receives an approval ok payload with `contentTransmitted` true
- **THEN** validation fails and MUST NOT treat the payload as a valid approval ok DTO

#### Scenario: Approval request missing previewSessionId is rejected
- **WHEN** the shared runtime validator receives an approval request missing `previewSessionId`
- **THEN** validation fails and MUST NOT treat the request as valid

#### Scenario: Invalid error payload is rejected
- **WHEN** the shared runtime validator receives a `ProjectErrorResponse` missing `code` or `message`
- **THEN** validation fails and MUST NOT treat the payload as a valid error contract

#### Scenario: Overlong displayName is rejected by shared validation
- **WHEN** a register request validator receives a trimmed `displayName` longer than 120 characters
- **THEN** validation fails for `invalid_display_name` (or equivalent rejection) and MUST NOT treat the request as valid

### Requirement: DeepSeek gateway probe contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for closed `DeepseekProbeStage` exactly `discovery` | `planning` | `applied` | `verify` (distinct from `ReviewStage`, which continues to include `new`), probe request `{ stage?: DeepseekProbeStage }`, probe ok DTO including `status` `ok`, `projectId`, `stage`, `providerId` `deepseek`, `modelAlias`, `resolvedModelId`, `schemaId` `deepseek-gateway-probe-v1`, `attemptCount` (1..3), `providerHttpStatus` 200, optional `providerRequestId`, total `latencyMs`, optional usage fields, and `parsed` exactly `{ ok: true; probe: 'deepseek-gateway-probe-v1'; message: string }`, plus closed DeepSeek error codes on `ProjectErrorResponse.code`: `deepseek_not_configured` | `deepseek_auth_failed` | `deepseek_insufficient_balance` | `deepseek_rate_limited` | `deepseek_provider_unavailable` | `deepseek_transport_failed` | `deepseek_timeout` | `deepseek_request_rejected` | `deepseek_model_unresolved` | `deepseek_empty_response` | `deepseek_truncated_response` | `deepseek_response_invalid` | `deepseek_schema_invalid` | `deepseek_model_mismatch` | `invalid_deepseek_probe_request` | `deepseek_gateway_failed`. Type guards MUST accept valid probe ok DTOs, MUST reject `stage` `new` and unknown probe stages on probe requests, MUST reject ok payloads missing `attemptCount` or `providerHttpStatus`, MUST reject `parsed` that does not match `deepseek-gateway-probe-v1`, and MUST NOT treat DeepSeek error codes as members of context-bundle or disclosure blocked unions. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid DeepSeek probe ok is accepted
- **WHEN** the shared runtime validator receives a well-formed probe ok payload with `DeepseekProbeStage`, both model fields, `attemptCount` in 1..3, `providerHttpStatus` 200, and valid `parsed`
- **THEN** validation succeeds

#### Scenario: Probe request with new is rejected
- **WHEN** the shared runtime validator receives a probe request with `stage` `new`
- **THEN** validation fails and MUST NOT treat the request as a valid DeepSeek probe request

#### Scenario: Probe ok missing attemptCount is rejected
- **WHEN** the shared runtime validator receives a probe ok payload without `attemptCount`
- **THEN** validation fails

#### Scenario: DeepSeek codes are not context-bundle blocked members
- **WHEN** shared blocked-union guards for context-bundle or disclosure are inspected
- **THEN** DeepSeek gateway error codes are not members of those blocked unions

### Requirement: Review-run orchestration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for review-run create request `{ stage: ReviewStage; contextBundleId: string; changeId?: string }`, review-run lifecycle states, stage-valid verdict unions, transition DTOs, safe transmission metadata DTOs, list wrappers, and closed codes including `invalid_review_run_request`, `review_run_not_found`, `review_run_in_progress`, `review_context_bundle_required`, `review_context_bundle_stage_mismatch`, `review_disclosure_approval_required`, `review_disclosure_policy_mismatch`, `review_context_integrity_mismatch`, `review_context_limit_exceeded`, `review_model_unresolved`, `review_run_invalid_transition`, `review_run_interrupted`, `review_schema_invalid`, `review_verdict_invalid`, and `review_run_failed`. Type guards MUST reject unknown create fields, invalid `changeId` shapes, and ok payloads that include excerpts, prompts, raw provider bodies, or secrets. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid review-run create request is accepted
- **WHEN** the shared runtime validator receives `{ stage: 'planning', contextBundleId: '…', changeId: 'chg-example' }`
- **THEN** validation succeeds

#### Scenario: Create request with unknown field is rejected
- **WHEN** the shared runtime validator receives a create body containing an unknown property
- **THEN** validation fails

#### Scenario: Ok DTO with excerpt field is rejected
- **WHEN** the shared runtime validator receives a review-run ok payload that includes an excerpt or prompt body field
- **THEN** validation fails
