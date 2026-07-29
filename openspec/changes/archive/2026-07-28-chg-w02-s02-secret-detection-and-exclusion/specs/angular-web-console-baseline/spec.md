## MODIFIED Requirements

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration, project-configuration, Git/OpenSpec discovery, multi-project project-dashboard, context-source-resolution, and secret-detection-and-exclusion operator surface in `apps/web` as required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, `project-dashboard`, `context-source-resolution`, and `secret-detection-and-exclusion` (register attach outcomes, explicit configuration refresh, explicit discovery refresh/get outcomes, discovery-health listing, explicit stage-scoped context-source resolve outcomes, and explicit stage-scoped secret-scan outcomes). This change MUST NOT implement complete product internationalization, accessibility polish, or light/dark/system theme switching (those remain later-slice scope).

#### Scenario: Spanish registration configuration discovery dashboard resolve and secret-scan surface is allowed
- **WHEN** the web console loads the project-registration, configuration-outcomes, discovery-outcomes, project-dashboard, context-source-resolution, and secret-detection operator surfaces delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for those flows

#### Scenario: Full i18n and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, and light/dark/system theme switching are not required or claimed as delivered by this change

## ADDED Requirements

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
