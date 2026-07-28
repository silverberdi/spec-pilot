# project-dashboard

## Purpose

Multi-project operator dashboard listing registered projects with fail-closed discovery-health derived from persisted fields; enriched ProjectDto list/detail API; Spanish-first console without delivery controls or target-repo mutation.

## Requirements

### Requirement: Derive discoveryHealth fail-closed from persisted Project fields
The system SHALL derive `ProjectDto.discoveryHealth` solely from persisted `Project.id`, `Project.lastInspectedAt`, and `Project.lastDiscovery`. Derivation MUST NOT inspect the target repository filesystem, MUST NOT invoke Git or OpenSpec CLI, MUST NOT auto-run discovery or configuration refresh, and MUST NOT invent a second discovery engine. Evaluation MUST follow this ordered matrix and MUST NEVER classify a persisted partial or inconsistent state as `never_inspected` or `ok`:

1. `lastInspectedAt == null` AND `lastDiscovery == null` → `status` `never_inspected`, `inspectedAt` null, `gitStatus` `unknown`, `openspecStatus` `unknown`, `summaryMessage` null.
2. Exactly one of `lastInspectedAt` or `lastDiscovery` is null → `status` `invalid`, `inspectedAt` is `lastInspectedAt` ISO if present else null, subsystem statuses `unknown`, safe generic `summaryMessage`.
3. Both present but `lastDiscovery` fails `isProjectDiscoveryDto` → `status` `invalid`, `inspectedAt` = `lastInspectedAt` ISO, subsystem statuses `unknown`, safe generic `summaryMessage`.
4. Type-guard passes but `lastDiscovery.projectId` does not equal `Project.id` → `status` `invalid` with the same invalid field pattern as (3).
5. Type-guard passes and projectId matches, but `lastDiscovery.inspectedAt` does not represent exactly the same UTC millisecond instant as `lastInspectedAt` → `status` `invalid` with the same invalid field pattern as (3). String formatting differences that denote the same instant MUST NOT cause `invalid`.
6. Valid snapshot with both subsystems `status` `ok` → `status` `ok`, `inspectedAt` = `lastInspectedAt` ISO, both subsystem statuses `ok`, `summaryMessage` null.
7. Valid snapshot with one or both subsystems `blocked` → `status` `blocked`, map each subsystem to `ok` or `blocked`, `inspectedAt` = `lastInspectedAt` ISO, `summaryMessage` from the closed code mapper.

`discoveryHealth` MUST use closed unions: `status` exactly `never_inspected` | `ok` | `blocked` | `invalid`; `gitStatus` and `openspecStatus` exactly `ok` | `blocked` | `unknown`.

#### Scenario: Newly registered project is never_inspected
- **WHEN** both `lastInspectedAt` and `lastDiscovery` are null
- **THEN** `discoveryHealth.status` is `never_inspected`, `inspectedAt` is null, both subsystem statuses are `unknown`, and `summaryMessage` is null

#### Scenario: Partial persistence is invalid not never_inspected
- **WHEN** exactly one of `lastInspectedAt` or `lastDiscovery` is null
- **THEN** `discoveryHealth.status` is `invalid` and MUST NOT be `never_inspected` or `ok`

#### Scenario: projectId mismatch is invalid
- **WHEN** a type-guard-valid `lastDiscovery` has `projectId` different from `Project.id`
- **THEN** `discoveryHealth.status` is `invalid`

#### Scenario: inspectedAt instant mismatch is invalid
- **WHEN** a type-guard-valid snapshot has `inspectedAt` at a different UTC millisecond instant than `lastInspectedAt`
- **THEN** `discoveryHealth.status` is `invalid`

#### Scenario: Both subsystems ok yields ok health
- **WHEN** a valid snapshot has `git.status` `ok` and `openspec.status` `ok`
- **THEN** `discoveryHealth.status` is `ok` and `summaryMessage` is null

#### Scenario: Blocked subsystem yields blocked health
- **WHEN** a valid snapshot has one or both subsystems `blocked`
- **THEN** `discoveryHealth.status` is `blocked` and each subsystem status is mapped to `ok` or `blocked`

### Requirement: Safe deterministic discoveryHealth summaryMessage mapper
`discoveryHealth.summaryMessage` MUST NEVER copy persisted `lastDiscovery.git.message`, `lastDiscovery.openspec.message`, or any other stored free-text into the health DTO. The server MUST map blocked codes through this closed Spanish mapper only:

Git: `not_a_git_repository` → `No es un repositorio Git.`; `git_inspect_failed` → `No fue posible inspeccionar el estado de Git.`; `git_inspection_timeout` → `La inspección de Git excedió el tiempo permitido.`

OpenSpec: `openspec_root_missing` → `No se encontró la estructura de OpenSpec.`; `openspec_inspect_failed` → `No fue posible inspeccionar la estructura de OpenSpec.`; `openspec_path_escape` → `La estructura de OpenSpec contiene una ruta no permitida.`; `openspec_inspection_limit_exceeded` → `La estructura de OpenSpec supera los límites de inspección.`

Any `invalid` status MUST use exactly `No fue posible interpretar el último resultado de descubrimiento.`

Composition MUST place the Git fragment first and the OpenSpec fragment second, joined by a single space when both subsystems are blocked. When only one is blocked, `summaryMessage` MUST be that subsystem's mapped fragment alone. `summaryMessage` MUST NEVER expose raw JSON, stack traces, commands, filesystem paths, parser details, or validation internals. Unknown blocked codes cannot pass `isProjectDiscoveryDto`; if such JSON is persisted, health MUST be `invalid` with the invalid generic message.

#### Scenario: Git-only blocked message is mapped
- **WHEN** a valid snapshot has Git blocked `not_a_git_repository` and OpenSpec ok
- **THEN** `summaryMessage` is exactly `No es un repositorio Git.`

#### Scenario: Both blocked messages join with one space
- **WHEN** a valid snapshot has Git blocked `not_a_git_repository` and OpenSpec blocked `openspec_root_missing`
- **THEN** `summaryMessage` is exactly `No es un repositorio Git. No se encontró la estructura de OpenSpec.`

#### Scenario: Invalid health uses generic message only
- **WHEN** derivation yields `status` `invalid`
- **THEN** `summaryMessage` is exactly `No fue posible interpretar el último resultado de descubrimiento.` and does not include persisted raw subsystem message text

#### Scenario: Persisted raw subsystem messages are not copied
- **WHEN** a blocked snapshot contains free-text `message` fields that differ from the closed mapper strings
- **THEN** `summaryMessage` still equals the closed mapper output and MUST NOT equal the persisted free-text fields

### Requirement: Project list returns enriched ProjectDto in stable order without dashboard endpoint
Every API response that returns `ProjectDto` MUST include `discoveryHealth`, including `POST /projects` (HTTP 201), `GET /projects` (HTTP 200), and `GET /projects/:id` (HTTP 200). `GET /projects` MUST order projects by `registeredAt` DESC then `id` ASC as a deterministic tie-breaker. The list MUST NOT include the full `lastDiscovery` blob. The system MUST NOT add `GET /dashboard`. List and detail enrichment MUST NOT open target-repository paths. Configuration and discovery refresh/get response DTOs remain unchanged unless they already embed `ProjectDto`. Invalid health rows MUST still return HTTP 200 on list/detail.

#### Scenario: Register response includes never_inspected discoveryHealth
- **WHEN** `POST /projects` succeeds with HTTP 201
- **THEN** the embedded `ProjectDto.discoveryHealth.status` is `never_inspected` with null `inspectedAt`, unknown subsystem statuses, and null `summaryMessage`

#### Scenario: List order is registeredAt DESC then id ASC
- **WHEN** multiple projects exist with distinct `registeredAt` values
- **THEN** `GET /projects` returns them ordered by `registeredAt` descending and uses `id` ascending only as a tie-breaker

#### Scenario: List omits full lastDiscovery blob
- **WHEN** `GET /projects` returns a project that has persisted discovery
- **THEN** each item includes `discoveryHealth` and MUST NOT include the full `lastDiscovery` snapshot payload

#### Scenario: No dedicated dashboard route
- **WHEN** API routes for this capability are inspected
- **THEN** no `GET /dashboard` (or equivalent dedicated dashboard collection) endpoint is required or delivered

#### Scenario: Invalid snapshot still lists with HTTP 200
- **WHEN** a project has corrupt or inconsistent persisted discovery fields
- **THEN** `GET /projects` still returns HTTP 200 including that project with `discoveryHealth.status` `invalid`

### Requirement: Spanish-first multi-project dashboard console outcomes
`apps/web` MUST expose a Spanish-first multi-project project dashboard that lists registered projects from `GET /projects` and presents discovery-health outcomes (`never_inspected`, `ok`, `blocked`, `invalid`) plus configuration linkage (`configurationVersionId` present versus missing) as separate concerns. The dashboard MUST preserve API list order by default and MUST NOT add client-side sorting, filtering, pagination, or virtual scrolling in this capability. The UI MUST present explicit empty, loading, success/populated, and error states. Dashboard load MUST NOT auto-run discovery or configuration refresh. Explicit per-project discovery refresh MAY remain available. The surface MUST NOT provide delivery controls (OpenSpec apply/verify/sync/archive, Git write, commit, PR, DeepSeek, budget, or review actions).

#### Scenario: Empty dashboard state
- **WHEN** the dashboard loads and `GET /projects` returns an empty array
- **THEN** explicit empty-registry dashboard copy is shown and MUST NOT be presented as an error

#### Scenario: Loading state during list fetch
- **WHEN** `GET /projects` is in flight for the dashboard
- **THEN** a loading state is presented until success or error is determined

#### Scenario: Populated dashboard shows health labels
- **WHEN** `GET /projects` returns one or more enriched projects
- **THEN** each row shows at least display name, slug, discovery health label, inspected time when present, and configuration linkage hint

#### Scenario: API order is preserved
- **WHEN** the dashboard renders a multi-project list from `GET /projects`
- **THEN** row order matches the API response order and no client-side sort is applied

#### Scenario: List error is explicit
- **WHEN** `GET /projects` fails
- **THEN** an error state is shown and the UI MUST NOT pretend the registry is empty solely because the request failed

#### Scenario: Delivery controls are absent
- **WHEN** the dashboard surface is inspected
- **THEN** apply/verify/sync/archive, commit, PR, DeepSeek, budget, and review controls are not present
