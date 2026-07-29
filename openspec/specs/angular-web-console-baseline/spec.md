# angular-web-console-baseline

## Purpose

Angular 22 standalone web console baseline with PrimeNG, Spanish-first i18n-ready shell presentation, and explicit bootstrap states.

## Requirements

### Requirement: Angular 22 standalone web console exists
The repository SHALL provide `apps/web` as an Angular major 22 standalone application generated with `@nx/angular` version `23.1.0` or higher that is officially compatible with Angular 22. The application MUST bootstrap with standalone APIs and MUST NOT use an NgModule-based application bootstrap. Scaffolding that produces Angular major 21 MUST NOT be accepted.

#### Scenario: Standalone Angular web app is present
- **WHEN** the web console baseline is verified
- **THEN** `apps/web` exists as an Angular 22 standalone application without NgModule bootstrap

#### Scenario: Angular 22 is generated via compatible Nx Angular plugin
- **WHEN** the web console generator and dependencies are inspected
- **THEN** `@nx/angular` is at version `23.1.0` or higher and the generated application is Angular major 22, not Angular major 21

### Requirement: PrimeNG 22 standalone UI baseline
`apps/web` MUST use PrimeNG major 22, PrimeIcons, and the official themes package required by the resolved PrimeNG 22 release. PrimeNG MUST be configured through its official standalone provider-based setup with a compatible official theme preset.

#### Scenario: PrimeNG standalone configuration is present
- **WHEN** the web console dependencies and bootstrap configuration are inspected
- **THEN** PrimeNG 22, PrimeIcons, and the required official themes package are present and PrimeNG is configured via official standalone providers

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration, project-configuration, Git/OpenSpec discovery, multi-project project-dashboard, context-source-resolution, secret-detection-and-exclusion, context-bundle-manifest, and context-preview-and-approval operator surface in `apps/web` as required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, `project-dashboard`, `context-source-resolution`, `secret-detection-and-exclusion`, `context-bundle-manifest`, and `context-preview-and-approval` (register attach outcomes, explicit configuration refresh, explicit discovery refresh/get outcomes, discovery-health listing, explicit stage-scoped context-source resolve outcomes, explicit stage-scoped secret-scan outcomes, explicit stage-scoped context-bundle create/get/latest outcomes, and explicit disclosure preview/approval/status outcomes). This change MUST NOT implement complete product internationalization, accessibility polish, or light/dark/system theme switching (those remain later-slice scope).

#### Scenario: Spanish registration configuration discovery dashboard resolve secret-scan context-bundle and disclosure surface is allowed
- **WHEN** the web console loads the project-registration, configuration-outcomes, discovery-outcomes, project-dashboard, context-source-resolution, secret-detection, context-bundle, and disclosure preview/approval operator surfaces delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for those flows

#### Scenario: Full i18n and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, and light/dark/system theme switching are not required or claimed as delivered by this change

### Requirement: Shell exposes success, loading, and error behavior
The baseline shell MUST expose clear success, loading, and error behavior for shell bootstrap. If a shell region has no content yet, the UI MUST show an explicit empty placeholder rather than a blank failure state.

#### Scenario: Successful shell render
- **WHEN** web console bootstrap completes successfully
- **THEN** the shell renders in the success state

#### Scenario: Loading state is visible during bootstrap
- **WHEN** the web console is bootstrapping
- **THEN** a loading state is presented until success or error is determined

#### Scenario: Bootstrap failure is explicit
- **WHEN** web console bootstrap or required shell configuration fails
- **THEN** an error state is presented and the shell MUST NOT silently continue as if success occurred

### Requirement: Minimal Spanish-first context-source resolve console outcomes
`apps/web` MUST expose a minimal Spanish-first context-source-resolution operator surface for a selected project with a closed stage selector (`new` | `planning` | `applied` | `verify`) and an explicit resolve action. The UI MUST present idle, loading, success (including explicit empty success when `pathCount` is 0), and blocked/error outcomes driven by the resolve API contracts. On success the UI MUST show stage, `pathCount`, a short configuration hash prefix, and at most the first **200** paths from the API response while preserving server order. When `pathCount > 200`, the UI MUST show copy equivalent to `Mostrando 200 de N rutas`. The UI MUST NOT add pagination, an additional resolve endpoint, file-content reading, per-path follow-up calls, preview/approval actions, or delivery controls. API responses MAY contain the full `paths` array within server bounds; display capping is UI-only.

#### Scenario: Idle state before resolve
- **WHEN** a project is selected and no resolve has been performed yet
- **THEN** an idle/empty resolve state is shown without pretending success

#### Scenario: Loading state during resolve
- **WHEN** `POST /projects/:id/context-sources/resolve` is in flight
- **THEN** a loading state is presented and resolve is not treated as complete

#### Scenario: Success with paths shows capped list
- **WHEN** resolve returns HTTP 200 with `pathCount` greater than 200
- **THEN** the UI shows stage, path count, hash prefix, the first 200 paths in server order, and copy equivalent to `Mostrando 200 de N rutas`

#### Scenario: Empty success is explicit
- **WHEN** resolve returns HTTP 200 with `pathCount` 0
- **THEN** the UI shows an explicit empty-success outcome and does not treat it as blocked

#### Scenario: Blocked or error surfaces API message
- **WHEN** resolve returns HTTP 422 or 500 with `{ code, message }` (or blocked DTO equivalent)
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show resolve success

### Requirement: Minimal Spanish-first secret-scan console outcomes
`apps/web` MUST expose a minimal Spanish-first secret-detection operator surface for a selected project with the closed stage selector (`new` | `planning` | `applied` | `verify`) and an explicit secret-scan action distinct from resolve. The UI MUST present idle, loading, success (including explicit empty success when `candidatePathCount` is 0), success-with-exclusions (findings or unscannable non-empty with remaining eligible paths), and blocked/error outcomes driven by the secret-scan API contracts. On success the UI MUST show stage, `candidatePathCount`, `eligiblePathCount`, a short configuration hash prefix, finding count, unscannable count, at most the first **200** `eligiblePaths` preserving server order, and at most the first **50** findings as `path` + `detectorId` only. When `eligiblePathCount > 200`, the UI MUST show copy equivalent to `Mostrando 200 de N rutas`. On `unsafe_context_bundle` the UI MUST show the operator-facing message plus the three safe counts only. The UI MUST NOT show file contents, matched secret values, snippets, offsets, or line numbers; MUST NOT add pagination, content preview, approval, or DeepSeek send actions; and MUST NOT treat resolve success as secret-scan success.

#### Scenario: Idle state before secret scan
- **WHEN** a project is selected and no secret scan has been performed yet
- **THEN** an idle/empty secret-scan state is shown without pretending success

#### Scenario: Loading state during secret scan
- **WHEN** `POST /projects/:id/context-sources/secret-scan` is in flight
- **THEN** a loading state is presented and scan is not treated as complete

#### Scenario: Success with exclusions shows safe metadata only
- **WHEN** secret scan returns HTTP 200 with non-empty `findings` or `unscannable` and non-empty `eligiblePaths`
- **THEN** the UI shows counts, capped eligible paths, and findings as path plus detectorId only without file contents or secret values

#### Scenario: Empty candidate success is explicit
- **WHEN** secret scan returns HTTP 200 with `candidatePathCount` 0
- **THEN** the UI shows an explicit empty-success outcome and does not treat it as blocked

#### Scenario: Unsafe bundle shows counts only
- **WHEN** secret scan returns HTTP 422 with `code` `unsafe_context_bundle`
- **THEN** the UI shows the blocked outcome using the message and `candidatePathCount`, `findingCount`, and `unscannableCount` without listing finding or unscannable paths as success details

#### Scenario: Blocked or error surfaces API message
- **WHEN** secret scan returns HTTP 422 or 500 with `{ code, message }` (or blocked DTO equivalent)
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show scan success

### Requirement: Minimal Spanish-first context-bundle console outcomes
`apps/web` MUST expose a minimal Spanish-first context-bundle operator surface for a selected project with the closed stage selector (`new` | `planning` | `applied` | `verify`) and an explicit create-manifest action distinct from resolve, secret-scan, preview, and approval. The UI MUST present idle, loading, success (including explicit empty success), and blocked/error outcomes driven by the context-bundle API contracts. On success the UI MUST show stage, `entryCount`, `totalTokenEstimate`, short `manifestHash` and `sourceHash` prefixes, `manifestSchemaVersion`, `selectionPolicyId`, `tokenEstimatorId`, exclusion counts, and at most the first **200** entries with `path`, short `contentHash` prefix, `tokenEstimate`, and line-range summary. When `entryCount > 200`, the UI MUST show copy equivalent to `Mostrando 200 de N entradas`. On `unsafe_context_bundle` the UI MUST show the operator-facing message plus the three safe counts only. The UI MAY offer a load-latest action using GET latest `limit=1`. The context-bundle surface itself MUST NOT show file-body excerpts, matched secret values, snippets, DeepSeek send actions, or a transmission flag, and MUST NOT treat resolve, secret-scan, preview, or approval success as context-bundle create success. A separate disclosure surface owned by `context-preview-and-approval` MAY show bounded excerpts and approval controls.

#### Scenario: Idle state before context-bundle create
- **WHEN** a project is selected and no context bundle has been created or loaded yet
- **THEN** an idle/empty context-bundle state is shown without pretending success

#### Scenario: Loading state during context-bundle create
- **WHEN** `POST /projects/:id/context-bundles` is in flight
- **THEN** a loading state is presented and create is not treated as complete

#### Scenario: Success shows hashes tokens and algorithm ids
- **WHEN** create returns HTTP 201 with entries
- **THEN** the UI shows token estimate, hash prefixes, algorithm identity fields, and capped entry summaries without file contents

#### Scenario: Empty bundle success is explicit
- **WHEN** create returns HTTP 201 with `entryCount` 0
- **THEN** the UI shows an explicit empty-success outcome and does not treat it as blocked

#### Scenario: Unsafe bundle shows counts only
- **WHEN** create returns HTTP 422 with `code` `unsafe_context_bundle`
- **THEN** the UI shows the blocked outcome using the message and `candidatePathCount`, `findingCount`, and `unscannableCount` without listing exclusion paths as success details

#### Scenario: Blocked or error surfaces API message
- **WHEN** create returns HTTP 422 or 500 with `{ code, message }` (or blocked DTO equivalent)
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show create success

### Requirement: Minimal Spanish-first disclosure preview and approval console outcomes
`apps/web` MUST expose a minimal Spanish-first disclosure preview and approval operator surface for a selected project and bundle, distinct from resolve, secret-scan, and context-bundle create. The UI MUST present idle, loading, success (including explicit empty success), and blocked/error outcomes driven by the disclosure API contracts. Explicit actions MUST include vista previa and aprobar divulgación, and MAY include disclosure status or latest-approval load. On preview success the UI MUST show stage, short `manifestHash` and `previewIntegrityHash` prefixes, `previewSessionId` prefix, expiry, `approvalRequired`, `previewPolicyId`, `approvalPolicyId`, `itemCount`, and at most the first **20** items with `path`, line-range summary, and excerpt text. When `itemCount > 20`, the UI MUST show copy equivalent to `Mostrando 20 de N entradas`. On approval success the UI MUST show approval id prefix, both policy ids, `contentTransmitted` as no/false, and `approvalRequired` false. Copy MUST state that approval does not send content to DeepSeek and that preview sessions expire in fifteen minutes. The UI MUST NOT add DeepSeek send actions or treat context-bundle create success as disclosure approval.

#### Scenario: Idle state before disclosure preview
- **WHEN** a project and bundle are selected and no disclosure preview has been performed yet
- **THEN** an idle/empty disclosure state is shown without pretending approval success

#### Scenario: Loading state during preview or approve
- **WHEN** preview or approve is in flight
- **THEN** a loading state is presented and the in-flight action is not treated as complete

#### Scenario: Preview success shows capped excerpts and policy ids
- **WHEN** preview returns HTTP 200 with items
- **THEN** the UI shows both policy ids, session/expiry identity, and at most 20 excerpts without DeepSeek send controls

#### Scenario: Empty preview success is explicit
- **WHEN** preview returns HTTP 200 with `itemCount` 0
- **THEN** the UI shows an explicit empty-success outcome and does not treat it as blocked

#### Scenario: Approval success shows disclosure-ready not transmitted
- **WHEN** approve returns HTTP 201
- **THEN** the UI shows both policy ids and `contentTransmitted` as no/false, and does not claim provider transmission

#### Scenario: Blocked or error surfaces API message
- **WHEN** preview or approve returns HTTP 422 or 500 with `{ code, message }` (or blocked DTO equivalent)
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show success
