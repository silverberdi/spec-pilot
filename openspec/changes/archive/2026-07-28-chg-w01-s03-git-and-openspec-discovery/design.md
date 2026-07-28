## Context

Wave `w01` has archived `w01-s01` (durable `Project` registry with realpath identity) and `w01-s02` (immutable `ProjectConfigurationVersion` snapshots and active linkage). `Project.lastInspectedAt` remains null after registration/configuration. SpecPilot still cannot observe Git or OpenSpec delivery state for registered local repositories.

Slice `w01-s03-git-and-openspec-discovery` must add read-only Repository Inspection + OpenSpec Discovery so operators—and later the dashboard (`w01-s04`)—can reason about discovery health without mutating target repos or inventing a parallel OpenSpec lifecycle (ADR-002, ADR-004). Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding.

## Goals / Non-Goals

**Goals:**

- Inspect Git state for a registered project’s canonical `repositoryPath` using allowlisted, read-only operations (inside-work-tree, HEAD/branch identity, working-tree cleanliness).
- Discover OpenSpec state for the same path via deterministic filesystem inspection of the standard OpenSpec layout, optionally enriched with official `openspec list --json` when a **local** CLI binary exists under that repository—without inventing lifecycle semantics and without resolving a global PATH binary.
- Persist a structured latest-discovery snapshot on the `Project` and set `lastInspectedAt` when an inspection cycle completes (including known blocked subsystem outcomes).
- Fail closed on hard failures (missing project, unreadable/missing repository path); never treat unknown state as healthy; never write into the target repository; never execute delivery/Git-write/OpenSpec apply-verify-sync-archive workflows from SpecPilot.
- Enforce path containment, exact traversal bounds, closed blocked-code unions, and non-interactive Git execution as binding safety contracts.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for discovery refresh/get outcomes (success, blocked, empty, loading, error)—not a multi-project dashboard.
- Deliver deterministic automated evidence for success and at least one blocked/failure path; keep quality gates green.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Project dashboard or multi-project discovery-health listing UI (`w01-s04`).
- Editing target repositories; running Git write commands, OpenSpec apply/verify/sync/archive, Cursor/Cline, tests, commits, or PRs from SpecPilot.
- Auto-running discovery on `POST /projects` (registration/configuration attach remain unchanged).
- Immutable discovery version history tables (latest snapshot only for this slice).
- Budget enforcement, DeepSeek API calls, reviews, findings, prompts, or context-bundle materialization.
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Changing `project.yaml` parse/schema/versioning behavior (`w01-s02` remains authoritative for configuration).
- Editing OpenSpec-generated integrations except via `openspec update`.
- Arbitrary shell execution from operator input.
- Resolving or executing a global `openspec` binary from PATH.

## Decisions

### D1 — Persist latest discovery on `Project` (not immutable versions)

Extend Prisma `Project` with a nullable JSON column for the latest structured discovery result and continue using existing nullable `lastInspectedAt`.

| Field | Storage | Notes |
|---|---|---|
| `lastInspectedAt` | timestamptz? | Set when a discovery refresh cycle completes and persists a snapshot (see D2) |
| `lastDiscovery` | Json? | Latest `ProjectDiscoverySnapshot` payload (git + openspec + inspectedAt); null until first completed refresh |

No new `ProjectDiscoveryVersion` table in this slice. Dashboard (`w01-s04`) can read `lastDiscovery` / `lastInspectedAt` without re-probing; operators re-run refresh for freshness.

- *Alternative considered:* immutable discovery version rows (mirror configuration). Rejected for this slice — discovery is observational freshness, not a portable contract hash history; latest JSON is enough for `w01-s04`.
- *Alternative considered:* compute-only (no persistence beyond `lastInspectedAt`). Rejected — proposal requires structured outcomes so dashboard is not ad-hoc re-probing without a contract.
- *Alternative considered:* separate one-row-per-project table. Rejected — adds join complexity for a single latest blob already owned by `Project`.

### D2 — When to set `lastInspectedAt` and overwrite `lastDiscovery`

**Hard failures** (do **not** update `lastInspectedAt` or `lastDiscovery`):

- Unknown `projectId` → HTTP 404 `project_not_found`
- Stored `repositoryPath` missing, not a directory, or not readable → HTTP 422 with existing/aligned codes (`repository_not_found`, `repository_not_directory`, `repository_not_readable`)

**Completed inspection cycle** (always update both fields in one transaction):

- Repository path is usable; Git and OpenSpec subsystems each produce either a success payload or a machine-readable blocked outcome from the closed unions in D7.
- Persist the composite snapshot even when one or both subsystems are blocked (including `openspec_inspection_limit_exceeded` / `openspec_path_escape` / Git blocked codes)—known unhealthy/incomplete is still a completed inspection.
- Completed cycles with blocked OpenSpec (or Git) still return HTTP **200** and persist the snapshot, provided the repository hard-path checks succeeded.
- `lastInspectedAt` = inspection completion timestamp (ISO in API; timestamptz in DB).
- `lastDiscovery.inspectedAt` MUST equal `lastInspectedAt`.

Partial/unknown mid-flight crashes (unexpected infra) → HTTP 500 `discovery_refresh_failed`; do not partially update fields.

- *Alternative considered:* set `lastInspectedAt` only when both subsystems succeed. Rejected — blocked Git or missing OpenSpec is still valuable discovery health for the dashboard.
- *Alternative considered:* auto-discover on register. Rejected — keeps registration/config latency and failure matrix unchanged; discovery is an explicit operator action for this slice.

### D3 — Composite discovery snapshot shape (binding)

Shared-contracts DTO (conceptual; exact TypeScript in apply). Blocked `code` fields are **closed unions** (D7)—not open `string`.

```ts
type ProjectDiscoveryDto = {
  projectId: string;
  inspectedAt: string; // ISO-8601
  git: GitDiscoveryDto;
  openspec: OpenSpecDiscoveryDto;
};

type GitDiscoveryBlockedCode =
  | 'not_a_git_repository'
  | 'git_inspect_failed'
  | 'git_inspection_timeout';

type OpenSpecDiscoveryBlockedCode =
  | 'openspec_root_missing'
  | 'openspec_inspect_failed'
  | 'openspec_path_escape'
  | 'openspec_inspection_limit_exceeded';

type GitDiscoveryDto =
  | {
      status: 'ok';
      isRepo: true;
      headSha: string | null; // null only for confirmed unborn HEAD; else exactly 40 lowercase hex
      branch: string | null; // null only for detached HEAD; else non-empty branch name
      dirty: boolean; // true if porcelain status has any entry
      upstream: string | null; // null when missing/unavailable; never blocks
    }
  | {
      status: 'blocked';
      code: GitDiscoveryBlockedCode;
      message: string;
    };

type OpenSpecDiscoveryDto =
  | {
      status: 'ok';
      rootPresent: true;
      activeChanges: OpenSpecChangeSummaryDto[];
      archivedChangeCount: number;
      cliAvailable: boolean;
    }
  | {
      status: 'blocked';
      code: OpenSpecDiscoveryBlockedCode;
      message: string;
    };

type OpenSpecChangeSummaryDto = {
  name: string; // immediate regular directory name under openspec/changes (excluding archive)
  hasProposal: boolean;
  hasDesign: boolean;
  hasTasks: boolean;
  hasSpecs: boolean;
};
```

`GET /projects` / `GET /projects/:id` continue returning `ProjectDto` with `lastInspectedAt`; they do **not** embed the full discovery blob (keep list payloads small). Full snapshot is discovery get/refresh only.

Type guards MUST reject unknown blocked codes and ambiguous union shapes (e.g. `ok` with `code`, `blocked` without `code`, missing required ok fields).

- *Alternative considered:* embed discovery on every `ProjectDto`. Rejected — list size/noise; dedicated discovery routes match configuration pattern.
- *Alternative considered:* open `code: string` on blocked unions. Rejected — closed shared-contract unions only.

### D4 — Git inspection: allowlisted `execFile` only

Implement a Git port that runs **fixed argv** via Node `child_process.execFile` (never `exec` / never shell; never interpolate operator strings into the command).

Working directory MUST be the project’s canonical `repositoryPath` only.

Do **not** accept operator-provided flags, commands, pathspecs, revisions, or environment values.

**Execution bounds (binding):**

| Knob | Value |
|---|---|
| timeout | **5000** ms per command |
| maxBuffer | **1048576** bytes per command |

**Deterministic / non-interactive environment (binding)** — set on every Git `execFile` invocation (merged over a minimal env; do not forward arbitrary process.env wholesale for Git):

- `GIT_TERMINAL_PROMPT=0`
- `GIT_OPTIONAL_LOCKS=0`
- `LC_ALL=C`

Allowlisted invocations (exact purpose; argv fixed):

1. `git rev-parse --is-inside-work-tree` → must print `true` or map to `not_a_git_repository`
2. `git rev-parse --abbrev-ref HEAD` → non-empty branch name, or treat literal `HEAD` as detached (`branch: null` only). Any other empty/invalid abbrev-ref outcome for a required success path → `git_inspect_failed`
3. `git rev-parse HEAD` → on success, `headSha` MUST be exactly **40 lowercase hexadecimal** characters; reject/normalize failure otherwise. A failed `git rev-parse HEAD` may map to `headSha: null` **only** for a confirmed valid Git work tree with **unborn HEAD**. All other required-command failures → `git_inspect_failed`
4. `git status --porcelain=v1` → `dirty = output.trim().length > 0`

Optional (only if still fixed argv and cheap): `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}` → `upstream` or `null` on failure. Missing upstream remains `upstream: null` and **does not** block.

**Timeout mapping (binding):** when a **required** Git command exceeds the 5000 ms timeout → blocked Git with `git_inspection_timeout` (distinct from `git_inspect_failed`).

Non-zero exit / invalid output for required checks (other than the specific mappings above) → `git_inspect_failed` (or `not_a_git_repository` when applicable).

Do **not** use `simple-git` unless apply-time evidence shows execFile is insufficient; prefer zero new dependency.

- *Alternative considered:* pure filesystem `.git` reads. Rejected — porcelain dirty detection and ref resolution are error-prone vs allowlisted git.
- *Alternative considered:* `simple-git` library. Rejected for now — wider surface; execFile + argv allowlist is clearer for ADR-004 safety review.
- *Alternative considered:* `git status -sb` parsing for branch. Rejected — separate rev-parse calls are simpler and more deterministic.
- *Alternative considered:* fold timeouts into `git_inspect_failed`. Rejected — `git_inspection_timeout` is a distinct blocked code.

### D5 — OpenSpec discovery: filesystem primary, local CLI optional enrichment

#### D5.1 — Path containment (binding for all OpenSpec filesystem inspection)

The registered `repositoryPath` is already canonical via realpath (from registration).

Before inspecting `openspec`, `openspec/changes`, `openspec/changes/archive`, active change directories, `specs` directories, or candidate spec files:

1. Resolve paths safely (realpath / equivalent containment check).
2. Every resolved path MUST remain equal to or below the canonical `repositoryPath`.
3. Do **not** follow a symlink that resolves outside the canonical repository.
4. Do **not** inspect any file or directory outside that boundary.
5. A detected escape → blocked OpenSpec with `openspec_path_escape`.
6. Presence checks count **regular files** / **regular directories** only as appropriate for each rule below.
7. Do **not** ingest file contents; inspect names, metadata, and existence only.

Do **not** follow symbolic links during traversal (listing/walk); containment checks that detect out-of-tree symlink targets produce `openspec_path_escape` without inspecting the escape target.

#### D5.2 — Exact bounded traversal (binding)

| Bound | Value |
|---|---|
| Maximum active change directories inspected per refresh | **500** |
| Maximum filesystem entries visited below all active changes’ `specs/` directories **combined** | **10000** |
| Archive discovery | Count **immediate regular directories** under `openspec/changes/archive/` only; **do not recurse** |
| Symlinks during traversal | **Do not follow** |

When a bound is exceeded → blocked OpenSpec with `openspec_inspection_limit_exceeded`.

A completed composite discovery with this OpenSpec blocked outcome still returns HTTP **200** and persists the snapshot, provided the repository hard-path checks succeeded (D2).

#### D5.3 — Exact artifact presence rules (binding)

**Primary (required):** read-only filesystem inspection under `repositoryPath`:

1. Confirm `openspec` exists as a regular directory inside the containment boundary → else blocked `openspec_root_missing`
2. Active change names come **only** from **immediate regular directories** under `openspec/changes/` excluding `archive`
3. Cap active changes at 500 per D5.2; exceeding → `openspec_inspection_limit_exceeded`
4. For each inspected active change directory, set booleans:
   - `hasProposal` — true **only** when `proposal.md` is a **regular file directly under** the active change directory
   - `hasDesign` — true **only** when `design.md` is a **regular file directly under** the active change directory
   - `hasTasks` — true **only** when `tasks.md` is a **regular file directly under** the active change directory
   - `hasSpecs` — true **only** when at least one **regular file** matches exactly:
     `openspec/changes/<change>/specs/<capability>/spec.md`
     (i.e. `specs/<capability>/spec.md` relative to the change directory). Do **not** treat arbitrary Markdown files under `specs/` as capability specs. Specs traversal counts toward the combined 10000 entry budget.
5. `archivedChangeCount` — number of **immediate regular directories** under `openspec/changes/archive/` (no recursion; no deep-parse of archived proposals)
6. Empty active changes with a valid OpenSpec root remains `status: 'ok'` (empty discovery, not blocked)
7. Unexpected filesystem errors during inspection (other than the closed blocked codes) → `openspec_inspect_failed`

#### D5.4 — Optional local CLI enrichment (binding)

Filesystem discovery remains **authoritative**.

Optional CLI enrichment may use **only**:

`<repositoryPath>/node_modules/.bin/openspec`

Rules:

- Do **not** resolve or execute a global `openspec` binary from PATH.
- Confirm the local CLI path resolves to a **regular executable file** inside the canonical repository path (containment + regular-file + executable checks).
- Invoke **only** fixed argv: `openspec list --json` (via `execFile` on that binary path—or equivalent argv that executes that file with `list` and `--json` only).
- `cwd` MUST equal the canonical `repositoryPath`.
- Never use shell execution.
- Same timeout/maxBuffer bounds as Git: **5000** ms / **1048576** bytes.
- If the binary is absent → `cliAvailable: false`; filesystem discovery continues successfully.
- If the binary exists but execution times out, fails, or returns unusable JSON → filesystem discovery continues; `cliAvailable: false`; log the failure safely (no stack/path leakage beyond project id / code).
- CLI failure alone MUST **never** block a filesystem-successful OpenSpec discovery.
- Never invoke `new`, `apply`, `verify`, `sync`, `archive`, `update`, or any other OpenSpec command.

Use CLI output only to confirm/annotate active change names when parseable; **filesystem remains authoritative for artifact presence and active directory enumeration**.

- *Alternative considered:* CLI-only discovery. Rejected — target repos may lack a local CLI; filesystem layout is the durable OpenSpec contract SpecPilot can always read.
- *Alternative considered:* PATH / global `openspec` fallback. Rejected — binding forbids PATH resolution; only `<repositoryPath>/node_modules/.bin/openspec`.
- *Alternative considered:* treat arbitrary `*.md` under `specs/` as specs. Rejected — only `specs/<capability>/spec.md` regular files count.
- *Alternative considered:* deep artifact completeness scoring / Verify readiness. Rejected — later waves; this slice reports presence facts only.

### D6 — Modular monolith boundaries

Implement inside existing `apps/api` `ProjectsModule`:

- `DiscoveryService` (or equivalent) methods: `refreshDiscovery(projectId)`, `getDiscovery(projectId)`
- Ports: `GitInspector` (execFile allowlist), `OpenSpecInspector` (fs containment + bounds + optional local CLI), Prisma update for `lastDiscovery` + `lastInspectedAt`
- Shared DTOs/type guards in `packages/shared-contracts`
- No new Nx domain package; Nx boundaries unchanged (web → shared-contracts only; API must not import web)

- *Alternative considered:* separate Nest modules per architecture name (`RepositoryInspectionModule`, `OpenSpecDiscoveryModule`). Deferred — single consumer; keep cohesion under Projects until a second consumer appears.

### D7 — API / shared contracts and closed code unions

**HTTP surface (additive):**

#### `POST /projects/:id/discovery/refresh`

| Status | When | Body |
|---|---|---|
| **200** | Inspection cycle completed (git/openspec ok or blocked subsystems) | `ProjectDiscoveryDto`; DB `lastDiscovery` + `lastInspectedAt` updated atomically |
| **404** | Unknown project | `project_not_found` |
| **422** | Hard path failures before inspection | `repository_not_found`, `repository_not_directory`, `repository_not_readable` |
| **500** | Unexpected infra mid-refresh | `discovery_refresh_failed`; safe message; no stack/paths leakage |

#### `GET /projects/:id/discovery`

| Status | When | Body |
|---|---|---|
| **200** | `lastDiscovery` present | `ProjectDiscoveryDto` |
| **404** | Unknown project | `project_not_found` |
| **404** | Project exists but never inspected | `discovery_not_found` |

**Closed blocked / API code unions (binding):**

| Kind | Codes |
|---|---|
| Git blocked (`git.status === 'blocked'`) | `not_a_git_repository`, `git_inspect_failed`, `git_inspection_timeout` |
| OpenSpec blocked (`openspec.status === 'blocked'`) | `openspec_root_missing`, `openspec_inspect_failed`, `openspec_path_escape`, `openspec_inspection_limit_exceeded` |
| Hard refresh / API (HTTP error bodies; not git/openspec ok unions) | `project_not_found`, `repository_not_found`, `repository_not_directory`, `repository_not_readable`, `discovery_not_found`, `discovery_refresh_failed` |

Extend shared-contracts error-code / discovery unions with exactly these closed sets. Type guards MUST reject unknown codes and ambiguous union shapes.

Registration and configuration endpoints remain behaviorally unchanged for this slice (still `lastInspectedAt: null` until first discovery refresh).

- *Alternative considered:* return 200 with empty body when never inspected. Rejected — explicit `discovery_not_found` matches configuration’s `configuration_not_found` pattern.
- *Alternative considered:* open-ended `code: string`. Rejected — closed unions only.

### D8 — Minimal Angular discovery outcomes (not dashboard)

Extend the existing Spanish-first console:

- Explicit “Actualizar descubrimiento” (or equivalent) action for a selected/known project id when the list is non-empty.
- Show last inspection time when present; show Git summary (branch/HEAD short + dirty) and OpenSpec summary (active count + blocked reason) after refresh/get.
- States: empty (no projects / never inspected), loading, success, blocked/error (API `message`/`code`).
- Do not build multi-project health tables, sorting/filtering dashboards, or delivery command runners.

- *Alternative considered:* API-only. Rejected — US-003 requires operator-visible console outcomes.

### D9 — Test strategy and evidence

Jest + existing Testcontainers PostgreSQL pattern:

1. **Unit — Git:** non-repo → `not_a_git_repository`; required-command timeout → `git_inspection_timeout`; invalid HEAD sha (not 40 lowercase hex) → `git_inspect_failed` (unless confirmed unborn → `headSha: null`); detached → `branch: null`; dirty detection from porcelain fixtures; env includes `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `LC_ALL=C`; timeout **5000** / maxBuffer **1048576**; never shell / never operator flags.
2. **Unit — OpenSpec:** missing root → `openspec_root_missing`; empty active changes with valid root → `ok`; artifact booleans only for direct regular `proposal.md` / `design.md` / `tasks.md` and `specs/<capability>/spec.md`; arbitrary markdown under specs does **not** set `hasSpecs`; archive counts immediate regular directories only; symlink escape → `openspec_path_escape`; >500 active changes or >10000 specs entries visited → `openspec_inspection_limit_exceeded`; local CLI absent → `cliAvailable: false` without blocking; local CLI timeout/fail/bad JSON → `cliAvailable: false` without blocking filesystem success; never PATH resolution; never other OpenSpec commands; never ingest file contents.
3. **API/integration:** refresh success updates `lastInspectedAt` + `lastDiscovery` atomically; refresh with non-git directory persists blocked git (and openspec as applicable) still **200**; OpenSpec limit/escape blocked outcomes still **200** + persist when hard-path checks succeeded; hard missing path → **422** without field updates; get before refresh → **404** `discovery_not_found`; unexpected failure → **500** `discovery_refresh_failed` without field updates; register still returns `lastInspectedAt: null`.
4. **Web:** component tests for empty/loading/success/blocked discovery states against mocked API.
5. Quality gates must `PASS` before commit/push. Capture evidence under this change’s `evidence/`.

Integration fixtures SHOULD use temporary directories with a minimal `git init` work tree and/or stub `openspec/changes/...` layout—avoid depending on the SpecPilot monorepo itself as the only fixture.

### D10 — Security, privacy, observability

- No arbitrary shell; argv allowlist only; `cwd` fixed to registered canonical realpath.
- Git: `execFile` only; timeout 5000 ms; maxBuffer 1048576; env `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `LC_ALL=C`; no operator-provided flags/commands/pathspecs/revisions/env.
- OpenSpec filesystem: path containment under canonical `repositoryPath`; no following out-of-tree symlinks; no inspection outside the boundary; no content ingestion; exact traversal bounds (500 active changes / 10000 specs entries / non-recursive archive).
- OpenSpec CLI: only `<repositoryPath>/node_modules/.bin/openspec` as a regular executable inside the repo; fixed `list --json`; never PATH; never other commands; CLI failure never blocks filesystem success.
- Do not walk application source trees beyond Git allowlisted inspection and the contained `openspec/` tree (plus optional local CLI).
- Do not ingest `.env`/key/secret file contents.
- Absolute `repositoryPath` remains DB-only operational data; client errors MUST NOT leak stack traces or extra host paths beyond the already-known registered path messaging style used by registration.
- Log project id, error `code`, and subsystem; safe CLI/Git failure logs without command-string construction from user input.
- No authentication change.
- Reuse Compose authorized read-only host root (`SPECPILOT_HOST_REPOS_ROOT`) — no new mount policy.

### D11 — Status field and configuration independence

Keep `Project.status` as `registered`. Discovery health lives in `lastDiscovery` / API outcomes—not a new project status enum (dashboard may present health later).

Discovery does **not** require an active `configurationVersionId`. A registered project with blocked/missing configuration can still be inspected (Git/OpenSpec are orthogonal to YAML validity).

- *Alternative considered:* require active configuration before discovery. Rejected — would hide Git/OpenSpec problems on projects that failed config attach.

### D12 — Docs and lifecycle

Update `docs/context/**` and package summary if dependencies change. Document operator discovery refresh flow. Sync/archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [Git availability inside Compose API container] → Document that `git` must be present in the API image/runtime; add to Dockerfile if missing.
- [Local OpenSpec CLI often absent in target repos] → Expected; `cliAvailable: false` with filesystem-authoritative success; never fall back to PATH/global binary.
- [CLI timeout / unusable JSON] → Continue filesystem discovery; `cliAvailable: false`; safe log; never block solely for CLI failure.
- [Dirty detection false positives from ignored files] → Use porcelain defaults; do not pass custom pathspecs from operators; document limitation.
- [Large `openspec/changes` trees] → Hard caps 500 active changes and 10000 combined specs entries; archive immediate-directories only; exceed → `openspec_inspection_limit_exceeded` with HTTP 200 + persist.
- [Symlink escapes under openspec layout] → Containment checks; do not follow out-of-tree links; `openspec_path_escape`.
- [CLI JSON shape drift across OpenSpec versions] → Treat CLI as enrichment only; filesystem authoritative; unusable JSON → `cliAvailable: false` without blocking.
- [Operators mistaking discovery for delivery execution] → UI/API copy states read-only inspection; never expose apply/verify/sync/archive/update/new actions in this slice.
- [Scope creep into dashboard] → Non-goals binding; tasks reject multi-project health UI.
- [Stale `lastDiscovery` after local repo changes] → Explicit refresh only; dashboard later may show staleness via `lastInspectedAt`.
- [Unexpected mid-refresh infra leaving partial JSON] → Single transaction updating `lastDiscovery` + `lastInspectedAt` together; 500 path skips update.
- [Git hang / lock prompts] → Non-interactive env (`GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `LC_ALL=C`) + 5000 ms timeout → `git_inspection_timeout`.

## Migration Plan

1. Add shared-contracts discovery DTOs, closed error-code unions, and type guards that reject unknown codes / ambiguous shapes.
2. Additive Prisma migration: `projects.last_discovery` JSON NULL (retain existing `last_inspected_at`); `prisma migrate deploy` in Compose/tests.
3. Implement Git allowlist port (D4) + OpenSpec filesystem containment/bounds + optional local-CLI inspectors (D5); wire `DiscoveryService` into `ProjectsModule`.
4. Add `POST /projects/:id/discovery/refresh` and `GET /projects/:id/discovery`.
5. Ensure API runtime includes `git` (Dockerfile/Compose adjustment if needed). Do **not** rely on a global OpenSpec CLI.
6. Extend Angular console for discovery refresh/get outcomes (Spanish-first).
7. Add unit + Testcontainers + web tests covering closed codes, bounds, containment, CLI non-blocking rules, and Git timeout/env; write `evidence/` artifacts.
8. Run `npm run quality-gates`; update docs/context and package summary as needed.
9. Operator-approved commit/push on `main` after reported validations.
10. Operator-approved Verify exactly `PASS`, sync, archive.

**Rollback:** revert slice commits on `main`; roll back or reset only the local SpecPilot DB/volume per Compose docs; never touch foreign Docker resources (e.g. `axioma-db-dev`).

## Open Questions

- None blocking planning. Persistence (latest-only), allowlisted Git argv/env/timeouts, filesystem-primary OpenSpec discovery with path containment and exact bounds, local-CLI-only enrichment, closed blocked-code unions, refresh/get API, and `lastInspectedAt` update rules are binding above. Immutable discovery history and dashboard aggregation remain deferred to later slices/waves.
