## MODIFIED Requirements

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration, project-configuration, Git/OpenSpec discovery, multi-project project-dashboard, and context-source-resolution operator surface in `apps/web` as required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, `project-dashboard`, and `context-source-resolution` (register attach outcomes, explicit configuration refresh, explicit discovery refresh/get outcomes, discovery-health listing, and explicit stage-scoped context-source resolve outcomes). This change MUST NOT implement complete product internationalization, accessibility polish, or light/dark/system theme switching (those remain later-slice scope).

#### Scenario: Spanish registration configuration discovery dashboard and resolve surface is allowed
- **WHEN** the web console loads the project-registration, configuration-outcomes, discovery-outcomes, project-dashboard, and context-source-resolution operator surfaces delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for those flows

#### Scenario: Full i18n and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, and light/dark/system theme switching are not required or claimed as delivered by this change

## ADDED Requirements

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
