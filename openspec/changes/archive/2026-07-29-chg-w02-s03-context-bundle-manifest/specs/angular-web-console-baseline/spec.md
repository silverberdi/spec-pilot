## MODIFIED Requirements

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration, project-configuration, Git/OpenSpec discovery, multi-project project-dashboard, context-source-resolution, secret-detection-and-exclusion, and context-bundle-manifest operator surface in `apps/web` as required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, `project-dashboard`, `context-source-resolution`, `secret-detection-and-exclusion`, and `context-bundle-manifest` (register attach outcomes, explicit configuration refresh, explicit discovery refresh/get outcomes, discovery-health listing, explicit stage-scoped context-source resolve outcomes, explicit stage-scoped secret-scan outcomes, and explicit stage-scoped context-bundle create/get/latest outcomes). This change MUST NOT implement complete product internationalization, accessibility polish, or light/dark/system theme switching (those remain later-slice scope).

#### Scenario: Spanish registration configuration discovery dashboard resolve secret-scan and context-bundle surface is allowed
- **WHEN** the web console loads the project-registration, configuration-outcomes, discovery-outcomes, project-dashboard, context-source-resolution, secret-detection, and context-bundle operator surfaces delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for those flows

#### Scenario: Full i18n and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, and light/dark/system theme switching are not required or claimed as delivered by this change

## ADDED Requirements

### Requirement: Minimal Spanish-first context-bundle console outcomes
`apps/web` MUST expose a minimal Spanish-first context-bundle operator surface for a selected project with the closed stage selector (`new` | `planning` | `applied` | `verify`) and an explicit create-manifest action distinct from resolve and secret-scan. The UI MUST present idle, loading, success (including explicit empty success), and blocked/error outcomes driven by the context-bundle API contracts. On success the UI MUST show stage, `entryCount`, `totalTokenEstimate`, short `manifestHash` and `sourceHash` prefixes, `manifestSchemaVersion`, `selectionPolicyId`, `tokenEstimatorId`, exclusion counts, and at most the first **200** entries with `path`, short `contentHash` prefix, `tokenEstimate`, and line-range summary. When `entryCount > 200`, the UI MUST show copy equivalent to `Mostrando 200 de N entradas`. On `unsafe_context_bundle` the UI MUST show the operator-facing message plus the three safe counts only. The UI MAY offer a load-latest action using GET latest `limit=1`. The UI MUST NOT show file contents, matched secret values, snippets, approval controls, DeepSeek send actions, or a transmission flag; and MUST NOT treat resolve or secret-scan success as context-bundle success.

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
