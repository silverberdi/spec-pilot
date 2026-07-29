## MODIFIED Requirements

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration, project-configuration, discovery, project-dashboard health/list, context-source-resolution, and secret-detection-and-exclusion request/response and error contracts required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, `project-dashboard`, `context-source-resolution`, and `secret-detection-and-exclusion` without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Registration configuration discovery dashboard resolve and secret-scan contracts may live in shared-contracts
- **WHEN** shared contracts for project registration, configuration, discovery, dashboard health, context-source resolution, and secret detection are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

### Requirement: Project registration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for `RegisterProjectRequest`, `ProjectDto` (including `configurationVersionId: string | null`, `lastInspectedAt: string | null`, and required `discoveryHealth: ProjectDiscoveryHealthDto`), `ProjectDiscoveryHealthDto`, `DiscoveryHealthStatus` (`never_inspected` | `ok` | `blocked` | `invalid`), `ProjectErrorResponse` (`{ code: string; message: string }`), `ProjectConfigurationVersionDto`, binding `RegisterProjectResponse`, discovery contracts required by `git-and-openspec-discovery` including `ProjectDiscoveryDto` with closed Git and OpenSpec discriminated unions, context-source-resolution contracts required by `context-source-resolution` including `ReviewStage` (`new` | `planning` | `applied` | `verify`), `ContextSourceResolveRequest` (`{ stage: ReviewStage }`), `ContextSourceResolveOkDto`, `ContextSourceResolveBlockedDto`, `ContextSourceResolveDto`, and closed `ContextSourceResolveBlockedCode` exactly equal to `invalid_review_stage` | `configuration_not_found` | `invalid_context_patterns` | `context_path_escape` | `context_entry_unreadable` | `context_resolution_limit_exceeded` | `context_resolution_timeout` | `repository_not_found` | `repository_not_directory` | `repository_not_readable`, and secret-detection contracts required by `secret-detection-and-exclusion` including `SecretScanRequest` (`{ stage: ReviewStage }`), `SecretDetectorId`, `SecretFindingDto` (`path` + `detectorId` only), `UnscannablePathDto`, `SecretScanOkDto`, `SecretScanBlockedDto`, `SecretScanDto`, and closed scan-specific blocked codes `unsafe_context_bundle` | `secret_scan_limit_exceeded` | `secret_scan_timeout` | `secret_scan_entry_unreadable` unioned with `ContextSourceResolveBlockedCode`, plus minimal repository-owned runtime validators or type guards for those contracts. `ProjectErrorResponse.code` MUST allow `context_resolve_failed` for HTTP 500 unexpected resolve failures and `secret_scan_failed` for HTTP 500 unexpected secret-scan failures. `context_resolve_failed` MUST NOT be a member of `ContextSourceResolveBlockedCode`. `secret_scan_failed` MUST NOT be a member of the HTTP 422 `SecretScanBlockedCode` union. For `SecretScanBlockedDto`, type guards MUST require `candidatePathCount`, `findingCount`, and `unscannableCount` when `code` is `unsafe_context_bundle` and MUST reject those count fields when `code` is any other blocked code. Type guards MUST reject `SecretFindingDto` payloads that include matched values, snippets, offsets, line numbers, or surrounding context fields. `RegisterProjectResponse` MUST remain `ProjectDto & { configuration: { status: 'attached'; version: ProjectConfigurationVersionDto } | { status: 'blocked'; error: ProjectErrorResponse } }`. Git blocked codes MUST be exactly `not_a_git_repository` | `git_inspect_failed` | `git_inspection_timeout`. OpenSpec blocked codes MUST be exactly `openspec_root_missing` | `openspec_inspect_failed` | `openspec_path_escape` | `openspec_inspection_limit_exceeded`. Type guards MUST reject incomplete or ambiguous `configuration` unions, MUST reject unknown discovery blocked codes or ambiguous `git` / `openspec` unions, MUST reject `ProjectDto` payloads missing `discoveryHealth` or using unknown `discoveryHealth.status` / subsystem status values, MUST reject unknown review stages, MUST reject unknown context-source blocked codes, MUST reject ambiguous `ContextSourceResolveDto` shapes, MUST reject unknown secret detector ids, MUST reject unknown secret-scan blocked codes, and MUST reject ambiguous `SecretScanDto` shapes. When validating an `attached` response, guards MUST require `configurationVersionId` to equal `version.id`. When validating a `blocked` response, guards MUST require `configurationVersionId` to be `null`. The `displayName` maximum of 120 characters MUST remain enforced by the shared contract/validator surface. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

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
- **WHEN** the shared runtime validator receives a resolve or secret-scan request or ok payload with `stage` outside `new` | `planning` | `applied` | `verify`
- **THEN** validation fails

#### Scenario: Valid SecretScanOkDto is accepted
- **WHEN** the shared runtime validator receives a well-formed ok secret-scan payload with closed detector ids and `eligiblePathCount` equal to `eligiblePaths.length`
- **THEN** validation succeeds

#### Scenario: Unsafe block requires safe counts only
- **WHEN** the shared runtime validator receives a blocked secret-scan payload with `code` `unsafe_context_bundle`
- **THEN** validation succeeds only if `candidatePathCount`, `findingCount`, and `unscannableCount` are present, and fails if finding path arrays or match-text fields are included

#### Scenario: Non-unsafe blocked rejects count fields
- **WHEN** the shared runtime validator receives a blocked secret-scan payload with a non-`unsafe_context_bundle` code that includes `candidatePathCount`, `findingCount`, or `unscannableCount`
- **THEN** validation fails

#### Scenario: Finding with snippet fields is rejected
- **WHEN** the shared runtime validator receives a finding object that includes matched value, snippet, offset, or line-number fields
- **THEN** validation fails and MUST NOT treat the payload as a valid `SecretFindingDto`

#### Scenario: Unknown secret-scan blocked code is rejected
- **WHEN** the shared runtime validator receives a blocked secret-scan payload whose `code` is outside the closed secret-scan blocked union or equals `secret_scan_failed`
- **THEN** validation fails and MUST NOT treat the payload as a valid `SecretScanBlockedDto`

#### Scenario: Invalid error payload is rejected
- **WHEN** the shared runtime validator receives a `ProjectErrorResponse` missing `code` or `message`
- **THEN** validation fails and MUST NOT treat the payload as a valid error contract

#### Scenario: Overlong displayName is rejected by shared validation
- **WHEN** a register request validator receives a trimmed `displayName` longer than 120 characters
- **THEN** validation fails for `invalid_display_name` (or equivalent rejection) and MUST NOT treat the request as valid
