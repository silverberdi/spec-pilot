## Context

Wave `w01` has archived registration (`w01-s01`), configuration snapshots (`w01-s02`), and read-only Git/OpenSpec discovery with persisted `Project.lastDiscovery` + `lastInspectedAt` (`w01-s03`). The Angular console still centers on a minimal registration/refresh flow: `GET /projects` returns `ProjectDto` without discovery payload, and discovery health is only visible after selecting a project and refreshing.

Slice `w01-s04-project-dashboard` must display registered projects and discovery health as a multi-project operator surface so Wave 1 closes with a coherent registry view—without inventing a second discovery engine, without auto-mutating target repos on load, and without delivery controls (ADR-002, ADR-004). Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding.

## Goals / Non-Goals

**Goals:**

- Present a Spanish-first multi-project dashboard listing registered projects with discovery-health outcomes derived from persisted registration/discovery data.
- Derive health fail-closed from `lastInspectedAt` / `lastDiscovery` (and configuration linkage already on `Project`); never treat missing, partial, inconsistent, or unknown discovery as healthy or as `never_inspected`.
- Enrich the list/summary API contract only as needed so the dashboard does not N+1 call `GET /projects/:id/discovery` per row and does not re-probe the filesystem/Git/OpenSpec on dashboard load.
- Keep explicit per-project discovery refresh (`POST …/discovery/refresh`) as the freshness mechanism from `w01-s03`; dashboard load is read-only projection.
- Return `GET /projects` in a deterministic stable order and preserve that order in the Angular dashboard by default.
- Surface clear empty, loading, success, never-inspected, blocked, invalid, and error UI states.
- Deliver deterministic automated evidence for populated success, multi-project ordering, and at least one empty or blocked/never-inspected/invalid path; keep quality gates green.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Auto-running discovery (or configuration refresh) on every dashboard load.
- New discovery mutation semantics, new Git/OpenSpec inspectors, or a second discovery persistence model.
- Immutable discovery version history; reviews, findings, budgets, prompts, context bundles.
- Delivery controls: OpenSpec apply/verify/sync/archive, Git write, Cursor/Cline, tests, commits, PRs from SpecPilot.
- Authentication/multiuser; Windows/Linux; remote repos without local checkout.
- DeepSeek product API integration; Wave 2+ context preview/approval.
- Client-side sorting, filtering, pagination, or virtual scrolling for the project list (pagination deferred to a later change if registry size requires it).
- Editing OpenSpec-generated integrations except via `openspec update`.
- Shared UI kit packages or a new Nx domain app.

## Decisions

### D1 — Dashboard is a read-only projection over persisted `Project` rows

The dashboard MUST NOT invent discovery. Health comes only from:

| Source | Use |
|---|---|
| `Project` identity fields | `id`, `slug`, `displayName`, `repositoryPath`, `status`, `registeredAt` |
| `configurationVersionId` | Present vs missing active configuration linkage |
| `lastInspectedAt` | Paired with `lastDiscovery` for fail-closed health derivation (D2) |
| `lastDiscovery` JSON | Persisted `ProjectDiscoveryDto` from `w01-s03` |

No Prisma migration in this slice unless apply discovers a hard gap (none expected). No new tables. List derivation MUST NOT access the target repository filesystem, Git, or OpenSpec CLI.

- *Alternative considered:* compute health by calling Git/OpenSpec inspectors during `GET /projects`. Rejected — proposal forbids substituting auto-discovery for explicit refresh; would mutate freshness semantics and blow list latency.
- *Alternative considered:* N+1 `GET /projects/:id/discovery` from the web. Rejected — chatty, races with null `discovery_not_found`, and duplicates health derivation in the client.

### D2 — Enrich `ProjectDto` with closed `discoveryHealth` (binding)

Extend every API response that returns `ProjectDto` so each project includes a **derived** health summary. Prefer extending `ProjectDto` in `packages/shared-contracts`:

```ts
type DiscoveryHealthStatus =
  | 'never_inspected'
  | 'ok'
  | 'blocked'
  | 'invalid';

type ProjectDiscoveryHealthDto = {
  status: DiscoveryHealthStatus;
  inspectedAt: string | null; // ISO-8601 or null per matrix below
  gitStatus: 'ok' | 'blocked' | 'unknown';
  openspecStatus: 'ok' | 'blocked' | 'unknown';
  /** Blocked/invalid only; from closed code→message mapper (D3). Never raw persisted message text. */
  summaryMessage: string | null;
};

// ProjectDto gains:
discoveryHealth: ProjectDiscoveryHealthDto;
```

#### D2.1 — Exact `discoveryHealth` derivation matrix (binding)

Evaluate in order. Never classify a persisted partial or inconsistent state as `never_inspected` or `ok` (healthy).

| # | Condition | `status` | `inspectedAt` | `gitStatus` | `openspecStatus` | `summaryMessage` |
|---|---|---|---|---|---|---|
| 1 | `lastInspectedAt == null` **AND** `lastDiscovery == null` | `never_inspected` | `null` | `unknown` | `unknown` | `null` |
| 2 | Exactly one of `lastInspectedAt` or `lastDiscovery` is `null` | `invalid` | `lastInspectedAt` ISO if present, else `null` | `unknown` | `unknown` | safe generic invalid message (D3) |
| 3 | Both present, but `lastDiscovery` fails `isProjectDiscoveryDto` | `invalid` | `lastInspectedAt` ISO | `unknown` | `unknown` | safe generic invalid message (D3) |
| 4 | Both present, snapshot type-guard passes, but `lastDiscovery.projectId !== Project.id` | `invalid` | `lastInspectedAt` ISO | `unknown` | `unknown` | safe generic invalid message (D3) |
| 5 | Both present, type-guard passes, projectId matches, but `lastDiscovery.inspectedAt` does **not** represent exactly the same instant as `lastInspectedAt` | `invalid` | `lastInspectedAt` ISO | `unknown` | `unknown` | safe generic invalid message (D3) |
| 6 | Valid snapshot; both `git.status === 'ok'` and `openspec.status === 'ok'` | `ok` | `lastInspectedAt` ISO | `ok` | `ok` | `null` |
| 7 | Valid snapshot; one or both subsystems `status === 'blocked'` | `blocked` | `lastInspectedAt` ISO | map each to `ok` or `blocked` | map each to `ok` or `blocked` | closed code→message mapper (D3); Git first, OpenSpec second; join with one space when both blocked |

**Instant equality (row 5):** compare the same normalized UTC millisecond instant of `lastInspectedAt` and `lastDiscovery.inspectedAt` (e.g. both parsed as `Date` then `getTime()`). String formatting differences that denote the same instant MUST NOT cause `invalid`; different instants MUST.

**Newly registered project** (`POST /projects` 201): fields are both null → row 1 (`never_inspected`, all unknowns, `summaryMessage: null`).

`configurationVersionId` remains on `ProjectDto` for dashboard display of configuration linkage (attached vs missing). Do **not** invent a second configuration-health engine; missing `configurationVersionId` is shown as “sin configuración activa” (or equivalent Spanish copy), distinct from discovery health.

#### D2.2 — HTTP surface and `ProjectDto` consistency (binding)

| Endpoint | Behavior |
|---|---|
| `POST /projects` | `201` → `RegisterProjectResponse` includes enriched `ProjectDto` fields with `discoveryHealth` = never_inspected matrix (row 1) |
| `GET /projects` | `200` → `ProjectDto[]` including `discoveryHealth` for every row; empty array when none registered; **order: `registeredAt` DESC, then `id` ASC** (deterministic tie-breaker) |
| `GET /projects/:id` | `200` → same enriched `ProjectDto`; `404` `project_not_found` unchanged |

Do **not** add `GET /dashboard` in this slice—one list contract keeps registration and dashboard aligned.

Do **not** put the full `lastDiscovery` blob on list rows; full snapshot remains on `GET /projects/:id/discovery`.

Configuration and discovery refresh/get endpoint response DTOs remain unchanged unless they already embed `ProjectDto`. Any response that does return `ProjectDto` MUST include `discoveryHealth`.

- *Alternative considered:* separate `GET /projects/dashboard` aggregate. Rejected — duplicates list semantics; empty-state and registration already use `GET /projects`.
- *Alternative considered:* put full `lastDiscovery` blob on every list row. Rejected — list should stay summary-sized; full snapshot remains on `GET /projects/:id/discovery`.
- *Alternative considered:* client-only health derivation. Rejected — closed derivation + invalid-snapshot handling belong server-side once.
- *Alternative considered:* treat “either null” as `never_inspected`. Rejected — partial persistence is inconsistent and must be `invalid`.

### D3 — Safe deterministic `summaryMessage` mapper and type guards (binding)

#### D3.1 — Closed code → Spanish message mapper

`discoveryHealth.summaryMessage` MUST **never** copy persisted `lastDiscovery.git.message` / `lastDiscovery.openspec.message` (or any other stored free-text) into the health DTO.

Server-side mapper by closed code only:

**Git**

| Code | `summaryMessage` fragment |
|---|---|
| `not_a_git_repository` | `No es un repositorio Git.` |
| `git_inspect_failed` | `No fue posible inspeccionar el estado de Git.` |
| `git_inspection_timeout` | `La inspección de Git excedió el tiempo permitido.` |

**OpenSpec**

| Code | `summaryMessage` fragment |
|---|---|
| `openspec_root_missing` | `No se encontró la estructura de OpenSpec.` |
| `openspec_inspect_failed` | `No fue posible inspeccionar la estructura de OpenSpec.` |
| `openspec_path_escape` | `La estructura de OpenSpec contiene una ruta no permitida.` |
| `openspec_inspection_limit_exceeded` | `La estructura de OpenSpec supera los límites de inspección.` |

**Invalid snapshot** (any `status === 'invalid'` row in D2.1):

- Exactly: `No fue posible interpretar el último resultado de descubrimiento.`

**Composition rules:**

- Git fragment first, OpenSpec fragment second.
- When both subsystems are blocked, join the two mapped fragments with a single space.
- When only one is blocked, `summaryMessage` is that subsystem’s mapped fragment alone.
- Never expose persisted raw message text, raw JSON, stack traces, commands, filesystem paths, parser details, or validation internals in `summaryMessage` (or other health fields).
- Unknown Git/OpenSpec blocked codes cannot pass `isProjectDiscoveryDto`; if such JSON is persisted anyway, health is `invalid` (D2.1 row 3) with the invalid generic message—not a partial blocked mapping.

#### D3.2 — Type guards

Update `isProjectDto` (and list array guards if any) to require `discoveryHealth` with the closed `DiscoveryHealthStatus` union and closed `gitStatus`/`openspecStatus` unions. Reject unknown status strings.

When derivation yields `invalid`, the API MUST still return HTTP 200 for list/detail with the safe generic `summaryMessage`. Log project id + reason server-side only (no path/JSON dump to clients).

- *Alternative considered:* omit invalid projects from the list. Rejected — hides registry membership; operator must see the row as unhealthy.
- *Alternative considered:* HTTP 500 when any row is invalid. Rejected — one corrupt JSON must not take down the dashboard.
- *Alternative considered:* reuse stored subsystem `message` fields. Rejected — non-deterministic / may leak internals; closed mapper is binding.

### D4 — Angular multi-project dashboard surface (binding)

`apps/web` gains a primary **Proyectos** / dashboard section (Spanish-first copy) that:

1. On load: `GET /projects` → loading → empty **or** populated table/list.
2. **Preserve API order by default** (`registeredAt` DESC, `id` ASC). Do **not** add client-side sorting, filtering, pagination, or virtual scrolling in this slice. Wave 1 is a local single-operator installation with a bounded expected registry; pagination is explicitly deferred to a later change if registry size requires it.
3. For each row show at least: `displayName`, `slug`, discovery health label (`never_inspected` / `ok` / `blocked` / `invalid`), `inspectedAt` when present, and configuration linkage hint (`configurationVersionId` present vs missing)—configuration linkage separate from discovery health.
4. Empty state: explicit copy when the list is `[]` (no projects registered)—not an error.
5. List error: when `GET /projects` fails, show error state; do not pretend the registry is empty if a prior successful list exists (keep prior list optional; if none, show error).
6. Optional: selecting a row may still expose the existing per-project configuration/discovery refresh actions from `w01-s02`/`w01-s03` without becoming delivery controls. Explicit discovery refresh remains available; no auto-discovery or configuration refresh on dashboard load.
7. MUST NOT show apply/verify/sync/archive, commit, PR, DeepSeek, budget, or review controls.

PrimeNG table or simple list is acceptable; prefer the existing shell patterns. Copy keys stay Spanish with i18n-ready structure (same pattern as prior slices).

- *Alternative considered:* replace registration UI entirely. Rejected — registration remains required; dashboard composes with it in one console.
- *Alternative considered:* auto-refresh discovery when opening the dashboard. Rejected — D1; freshness stays explicit refresh.
- *Alternative considered:* client-side sort by displayName. Rejected — API order is the stable contract for this slice.

### D5 — Modular monolith boundaries

Implement inside existing modules:

| Layer | Responsibility |
|---|---|
| `packages/shared-contracts` | `DiscoveryHealthStatus`, `ProjectDiscoveryHealthDto`, enriched `ProjectDto`, type guards |
| `ProjectsService` (API) | `findMany` order `registeredAt desc`, `id asc`; `toDto` + pure `deriveDiscoveryHealth(projectId, lastInspectedAt, lastDiscovery)` + closed code→message mapper (unit-testable) |
| `apps/web` | Dashboard list UI + Spanish outcomes; consumes enriched list; preserves API order |
| Tests | Unit: full D2.1 matrix + message mapper; API/integration: list health + multi-project deterministic ordering; web: empty + populated/blocked/never_inspected + order preserved |

No new Nest module or Nx package. List path MUST NOT open target-repository paths.

### D6 — Security, privacy, observability

- Dashboard reads only SpecPilot DB fields already collected; no new filesystem/Git/OpenSpec access on list.
- Do not leak absolute host paths beyond the already-exposed `repositoryPath` on `ProjectDto`.
- Do not surface raw invalid JSON, persisted subsystem messages, stacks, commands, parser details, or validation internals in `summaryMessage`.
- No auth change (single local operator).
- Log invalid snapshot detections at warn with project id only.

### D7 — Test strategy (binding)

| Layer | Required evidence |
|---|---|
| Unit | `deriveDiscoveryHealth`: full D2.1 matrix (both-null never_inspected; exactly-one-null invalid; type-guard fail; projectId mismatch; inspectedAt instant mismatch; ok; blocked git-only / openspec-only / both) plus closed message mapper strings |
| API / integration | `GET /projects` returns `[]`; `POST /projects` 201 includes `discoveryHealth` never_inspected; list after discovery refresh shows `ok` or `blocked` as derived; **multiple projects prove order `registeredAt` DESC, `id` ASC** |
| Web | Empty dashboard; populated health labels; at least one blocked or never_inspected presentation; list order matches API response order |
| Gates | Full local quality gates + baseline remain green |

### D8 — Domain / API failure modes summary

| Case | Operator-visible behavior |
|---|---|
| No projects | Empty dashboard (not error) |
| Both discovery fields null (incl. new register) | `never_inspected`; `summaryMessage` null |
| Exactly one of `lastInspectedAt` / `lastDiscovery` null | `invalid` + safe generic message; list still 200 |
| Type-guard fail, projectId mismatch, or inspectedAt instant mismatch | `invalid` + safe generic message; list still 200 |
| Valid snapshot both subsystems ok | `ok`; `summaryMessage` null |
| Valid snapshot with blocked subsystem(s) | `blocked` + mapped Spanish summary (never raw persisted messages) |
| `GET /projects` infra failure | UI error; safe API 500 if applicable (existing patterns) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Stale health if operator never refreshes discovery | Explicit Spanish copy that health reflects last inspection; keep “Actualizar descubrimiento” available |
| Enriched `ProjectDto` breaks older clients | Additive required field only inside SpecPilot monorepo; update web + contracts together |
| Large `lastDiscovery` JSON parse cost on list | Summary derivation only; do not return full snapshot on list |
| Operators confuse configuration missing with discovery blocked | Separate labels: configuration linkage vs discovery health |
| Scope creep into delivery controls | Explicit Non-Goals; UI checklist excludes apply/verify/sync/archive |
| Unstable list order across reloads | Binding order `registeredAt` DESC, `id` ASC; web preserves API order; multi-project ordering tests |
| Large registry without pagination | Wave 1 bounded single-operator registry; pagination explicitly deferred to a later change |
| Partial/inconsistent persisted discovery looks healthy | Fail-closed D2.1 matrix; never map partial state to `never_inspected` or `ok` |

## Migration Plan

1. Add shared health DTO + guards; implement `deriveDiscoveryHealth` + closed message mapper; enrich `toDto` for every response returning `ProjectDto` (`POST /projects`, `GET /projects`, `GET /projects/:id`); set list order to `registeredAt` DESC, `id` ASC.
2. Update Angular dashboard UI + tests (order preserved; no client sort/filter/pagination/virtual scroll); keep registration/refresh flows working with enriched DTO.
3. No DB migration expected; if apply discovers otherwise, stop and revise design before shipping schema.
4. Regenerate package-summary; update `docs/context/current-state.md` on closure.
5. **Rollback:** revert API/UI/contracts commit(s); no volume wipe; no foreign Docker impact. Prior `lastDiscovery` data remains valid for `w01-s03` endpoints.

## Open Questions

None blocking. Deferred to apply-time detail only:

- Exact Spanish label strings for the four health **status** badges in the UI (distinct from the closed `summaryMessage` mapper strings already fixed in D3).
