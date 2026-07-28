## Context

Wave `w01` is archived: durable `Project` registry, immutable `ProjectConfigurationVersion` snapshots with `normalizedConfig.context.include` / `context.exclude` (mandatory secret-path excludes merged at validate time), Git/OpenSpec discovery, and a multi-project dashboard. SpecPilot still cannot turn that validated configuration into a concrete candidate file set for a review stage.

Slice `w02-s01-context-source-resolution` starts Wave 2 (Secure Context Assembly) by resolving stage-specific configured source sets—deterministic repository-relative path lists—without secret-content scanning (`w02-s02`), immutable manifests/token estimates (`w02-s03`), preview/approval (`w02-s04`), or DeepSeek transmission. Stakeholders: SpecPilot operator (approvals); Cursor (sole implementer). Main-only working policy remains binding.

## Goals / Non-Goals

**Goals:**

- Resolve a deterministic candidate path set for a registered project and requested review stage (`new` | `planning` | `applied` | `verify`) from the active validated configuration and the local registered repository tree.
- Apply include/exclude pattern matching against repository-relative paths; defensively union mandatory secret-path excludes into the effective exclude set used for matching; enforce repository-root containment with exact symlink policy (D4); never follow symlinks into walk destinations.
- Enumerate paths only—do not read file contents, compute content hashes, estimate tokens, or transmit payloads.
- Fail closed on missing/inactive configuration, unknown project, unusable repository path, unsupported stage, invalid patterns, path escape, unreadable walk entries, or traversal/payload-limit breach; never present incomplete/unsafe resolution as a healthy ready set or return partial path lists.
- Remain read-only toward target repositories; reuse Compose authorized host-root mount; no delivery/Git-write/OpenSpec apply-verify-sync-archive execution from SpecPilot; no Git subprocesses for submodule detection.
- Expose shared contracts plus NestJS API and a minimal Spanish-first Angular surface for resolve outcomes (success, empty, blocked, loading, error) with bounded UI presentation of path lists.
- Deliver deterministic automated evidence for success and at least one empty or blocked/failure path; keep quality gates green.
- Update docs/context inventory and package summary as needed.

**Non-Goals:**

- Secret-content detection, entropy/credential scanners, or unsafe-bundle blocking beyond path-level configured excludes (`w02-s02`).
- Immutable context-bundle manifests, selected-line ranges, content hashes, or token estimates (`w02-s03`).
- Context preview UI that displays file contents, or approval gates before runs (`w02-s04`).
- Expanding `schemaVersion: 1` with per-stage YAML overlays in this slice (consume existing global `context.include` / `context.exclude`).
- Persisting resolution snapshots/audit rows (ephemeral resolve only; later slices own durable manifests/audit).
- DeepSeek product API calls, reviews, findings, budget ledger, prompts.
- Editing target repositories; executing delivery/Git write/OpenSpec workflows from SpecPilot.
- Authentication/multiuser; Windows/Linux support; remote repos without local checkout.
- Editing OpenSpec-generated integrations except via `openspec update`.
- API pagination endpoints, per-path follow-up calls, or reading candidate file bytes for UI.

## Decisions

### D1 — Ephemeral resolve (no persistence)

Resolution is compute-on-demand. Do **not** add Prisma columns/tables for resolved path sets in this slice.

| Concern | Approach |
|---|---|
| Freshness | Every resolve re-reads active configuration + walks the repository |
| Dashboard / later slices | `w02-s03` owns durable manifests; this slice returns the live candidate set |
| Operator UX | Explicit resolve action; no stale “last resolved” DB field |

- *Alternative considered:* persist latest resolve JSON on `Project` (mirror discovery). Rejected — discovery is observational health for the dashboard; resolution is a pipeline input whose durable form is the future manifest, not a second snapshot type.
- *Alternative considered:* immutable resolution version rows. Rejected — out of scope; duplicates future manifest hashing (`w02-s03`).

### D2 — Stage is required metadata; source profile is the active global context

**Review stages (closed union):** `new` | `planning` | `applied` | `verify` (aligned with `docs/architecture/review-state-machine.md` and `review.models` keys).

For this slice, every stage uses the **same configured source profile**: active `ProjectConfigurationVersion.normalizedConfig.context.include` plus an **effective exclude set** derived from `context.exclude` with defensive mandatory union (D4.3). No per-stage YAML overlays.

The stage:

1. MUST be supplied on every resolve request.
2. MUST be validated against the closed union (unknown → 422 `invalid_review_stage`).
3. MUST be echoed on the success response; on blocked responses, echo the stage when it was valid, else `stage: null` when stage itself was invalid/missing.

**No `project.yaml` schema expansion** in this slice. Per-stage include/exclude overlays remain a future contract change if product evidence requires differentiated profiles.

- *Alternative considered:* add `context.stages.<stage>.{include,exclude}` to schemaVersion 1 now. Rejected — current portable contract and SpecPilot’s own `project.yaml` have a single global context; expanding schema without consumer differentiation adds migration cost before `w02-s02`/`w02-s03` need it.
- *Alternative considered:* omit stage and resolve “the context set” only. Rejected — wave/slice capability is explicitly stage-specific; later assembly is per review stage.
- *Alternative considered:* SpecPilot-hardcoded per-stage include overlays independent of YAML. Rejected — violates “configured” source sets (ADR-005); configuration remains the authority for patterns.

### D3 — Require active configuration before resolve

Unlike discovery (`w01-s03`), context-source resolution **requires** an active `configurationVersionId` pointing at a persisted `ProjectConfigurationVersion`.

| Precondition failure | HTTP | Code |
|---|---|---|
| Unknown project | 404 | `project_not_found` |
| Project exists, `configurationVersionId` null / no active version | 422 | `configuration_not_found` |
| Repository path missing / not directory / not readable | 422 | `repository_not_found` / `repository_not_directory` / `repository_not_readable` |
| Unsupported / missing stage | 422 | `invalid_review_stage` |

- *Alternative considered:* allow resolve without configuration using built-in defaults. Rejected — ADR-005 makes the portable contract authoritative; inventing defaults would bypass validated snapshots.
- *Alternative considered:* treat missing config as HTTP 200 blocked body. Rejected — align with configuration get’s explicit failure; 422 fail-closed before walking.

### D4 — Matching, walk, and path semantics (binding)

#### D4.1 — Symlink policy (binding)

The walk MUST use `lstat` (or equivalent semantics that **do not** follow symlinks automatically).

| Encounter | Count toward visited entries? | Action |
|---|---|---|
| Any symlink (file or directory) | **Yes** | Resolve the **target only** to check containment relative to canonical `repositoryPath` |
| Symlink target outside canonical `repositoryPath` | Yes | **Block entire resolve**; HTTP **422** `context_path_escape`; **no partial results** |
| Symlink target inside canonical `repositoryPath` | Yes | **Omit** the symlink; **do not** walk into its destination; **do not** return the symlink path as a candidate |
| Regular file found directly during walk | Yes | Eligible for include/exclude matching only |
| Directory (non-symlink) | Yes | Recurse into children (subject to `.git` skip and bounds) |

**Rules:**

- Do **not** follow symlinks of files or directories into the walk.
- Only **regular files** discovered directly during the walk may become candidates.
- This policy avoids cycles, duplicate aliases of the same path, and symlink-as-candidate disclosure.

#### D4.2 — `.git`, other dot entries, nested repositories (binding)

- Omit any walk entry whose path segment is exactly `.git` (file or directory). The omitted entry **counts** as a filesystem entry visited, but MUST NOT be traversed and MUST NOT be returned as a candidate.
- Other dotfiles/directories are considered normally (`dot: true` in glob options).
- A submodule or nested repository present as a **regular directory** is walked as part of the tree, subject to include/exclude and bounds. Its `.git` metadata entry is omitted by the rule above.
- Do **not** execute Git commands to detect submodules.

#### D4.3 — Effective exclude set (defensive mandatory union)

Although `normalizedConfig.context.exclude` MUST already contain mandatory secret-path excludes from `w01-s02`, the resolver MUST defensively union the following into the **effective** exclude set used for matching:

- `**/.env`
- `**/.env.*`
- `**/*.pem`
- `**/*.key`
- `**/secrets/**`

Rules:

- Do **not** modify `ProjectConfigurationVersion` or the persisted `normalizedConfig`.
- Deduplicate the effective exclude set (stable order: snapshot excludes in stored order, then append any missing mandatory patterns in the order listed above).
- `ContextSourceResolveOkDto.exclude` MUST return the **effective** exclude set actually used for matching.
- No legacy or inconsistent snapshot may allow those secret-bearing path patterns to become candidates.
- Tests MUST include a fixture where the snapshot omits at least one mandatory exclude and resolution still applies it.

#### D4.4 — Glob semantics (binding)

Pin `picomatch` at the API/workspace dependency set. Matching options MUST be conceptually equivalent to:

```ts
{ dot: true, nocase: false, nonegate: true }
```

| Rule | Binding |
|---|---|
| Case sensitivity | Case-sensitive (`nocase: false`) |
| Path / pattern separators | Only `/` |
| Windows rewriting | None |
| Include vs exclude | Independent lists; a leading `!` is **not** negation (`nonegate: true`) |
| Candidate rule | Matches ≥1 include AND matches **no** exclude; exclude always wins |
| Braces / extglobs | Standard semantics of the pinned picomatch version |

Reject with HTTP **422** `invalid_context_patterns` when any include or exclude pattern:

- is empty after trim;
- contains a NUL byte;
- is absolute (e.g. starts with `/`);
- contains a backslash `\`;
- contains a path segment `..`;
- cannot be compiled under the binding picomatch options.

**Inputs:** `include` from active `normalizedConfig.context.include`; effective `exclude` per D4.3. Missing/non-array runtime shape → 422 `invalid_context_patterns`.

#### D4.5 — Path representation and determinism (binding)

- Candidates are repository-relative paths using `/` separators.
- No leading `./`.
- No absolute paths in the result.
- Sort with exact JS comparison: `paths.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))`.
- Identical effective configuration + identical tree ⇒ identical `paths` array.
- **Never** open/read candidate file bytes for matching, hashing, size, mtime, tokens, or content.

- *Alternative considered:* gitignore semantics via `ignore` package. Rejected — contract patterns are glob include/exclude lists; picomatch keeps behavior explicit.
- *Alternative considered:* match directories as candidates. Rejected — source sets are file paths for later content assembly.
- *Alternative considered:* follow in-tree symlinks to their targets. Rejected — cycles/duplicates/aliases; omit in-tree symlinks instead.
- *Alternative considered:* auto-exclude `node_modules`. Rejected — belongs in project YAML excludes if desired.

### D5 — Traversal, match, and payload bounds (binding)

| Bound | Value | On exceed |
|---|---|---|
| Maximum filesystem entries visited (every `lstat`’d entry including directories, regular files, omitted `.git` entries, and every symlink) | **100000** | 422 `context_resolution_limit_exceeded` |
| Maximum matched files returned | **20000** | 422 `context_resolution_limit_exceeded` |
| Maximum combined UTF-8 byte length of returned path strings | **4194304** | 422 `context_resolution_limit_exceeded` |
| Maximum wall time per resolve | **15000** ms | 422 `context_resolution_timeout` |

**UTF-8 payload bound:** sum `Buffer.byteLength(path, 'utf8')` (or equivalent) for each repository-relative path that would be returned. Exceeding the bound MUST NOT truncate or return a partial list.

Exceeding any bound MUST NOT return a truncated “ok” path list.

- *Alternative considered:* return partial results with a warning. Rejected — fail closed; partial sets look ready for scanning/bundling.
- *Alternative considered:* unbounded walk/payload. Rejected — Compose/API DoS and huge responses.

### D6 — Response contract (binding)

Discriminated success DTO and closed 422 blocked codes in `packages/shared-contracts`:

```ts
type ReviewStage = 'new' | 'planning' | 'applied' | 'verify';

type ContextSourceResolveOkDto = {
  status: 'ok';
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string; // from active ProjectConfigurationVersion
  resolvedAt: string; // ISO-8601
  include: string[];
  exclude: string[]; // effective exclude set actually used (D4.3)
  pathCount: number;
  paths: string[]; // full sorted list; may be empty
};

/** Closed union for HTTP 422 bodies only — does NOT include context_resolve_failed */
type ContextSourceResolveBlockedCode =
  | 'invalid_review_stage'
  | 'configuration_not_found'
  | 'invalid_context_patterns'
  | 'context_path_escape'
  | 'context_entry_unreadable'
  | 'context_resolution_limit_exceeded'
  | 'context_resolution_timeout'
  | 'repository_not_found'
  | 'repository_not_directory'
  | 'repository_not_readable';

type ContextSourceResolveBlockedDto = {
  status: 'blocked';
  projectId: string;
  stage: ReviewStage | null; // null only when stage itself was invalid/missing
  code: ContextSourceResolveBlockedCode;
  message: string;
};

type ContextSourceResolveDto =
  | ContextSourceResolveOkDto
  | ContextSourceResolveBlockedDto;
```

**Empty success:** `status: 'ok'` with `paths: []` / `pathCount: 0` when include/exclude yield no files—operator-visible empty, not blocked.

**HTTP mapping:**

| Outcome | HTTP | Body |
|---|---|---|
| Successful resolve (including empty paths) | **200** | `ContextSourceResolveOkDto` (full `paths` array) |
| Unknown project | **404** | `ProjectErrorResponse` with `code: 'project_not_found'` |
| Expected resolve refusals (stage, config, patterns, path escape, unreadable entry, limits, timeout, repo hard-path) | **422** | `ContextSourceResolveBlockedDto` with closed `ContextSourceResolveBlockedCode` |
| Unexpected filesystem / Prisma / infrastructure failures | **500** | `ProjectErrorResponse` with `code: 'context_resolve_failed'`; safe message; **no** paths, stack, pattern, or absolute host path |

Notes:

- `context_resolve_failed` is **only** a 500 `ProjectErrorResponse` code. It is **not** a member of `ContextSourceResolveBlockedCode`.
- `EACCES` / `EPERM` while reading metadata or listing an entry during the walk → **422** `context_entry_unreadable`; **no partial results**.
- Type guards MUST reject unknown stages, unknown blocked codes, unknown 500 codes outside the existing project error unions as extended, and ambiguous shapes.

- *Alternative considered:* always HTTP 200 with `status` discriminant (like discovery blocked subsystems). Rejected for hard preconditions—missing config/path/stage are resolve refusals. Empty match remains 200 ok.
- *Alternative considered:* include file sizes/mtimes. Rejected — defer metadata enrichment to manifest slice (`w02-s03`).
- *Alternative considered:* put `context_resolve_failed` in the 422 blocked union. Rejected — unexpected infra is 500 only.

### D7 — API surface

#### `POST /projects/:id/context-sources/resolve`

Request body:

```ts
{ stage: ReviewStage }
```

Behavior: load project + active configuration version; validate stage; build effective excludes (D4.3); validate patterns (D4.4); walk with symlink/`.git` policy (D4.1–D4.2); match; enforce bounds (D5); return D6.

No `GET` last-resolve endpoint (nothing persisted). Operators re-POST to refresh.

Error mapping summary:

| Condition | HTTP | Code |
|---|---|---|
| Unknown `projectId` | 404 | `project_not_found` |
| Missing/invalid stage | 422 | `invalid_review_stage` |
| No active configuration | 422 | `configuration_not_found` |
| Invalid include/exclude patterns | 422 | `invalid_context_patterns` |
| Out-of-tree symlink | 422 | `context_path_escape` |
| `EACCES`/`EPERM` on walk entry | 422 | `context_entry_unreadable` |
| Visit / match / UTF-8 payload bounds | 422 | `context_resolution_limit_exceeded` |
| Wall-time bound | 422 | `context_resolution_timeout` |
| Repo missing / not dir / not readable | 422 | `repository_not_found` / `repository_not_directory` / `repository_not_readable` |
| Unexpected infra | 500 | `context_resolve_failed` |

- *Alternative considered:* `GET /projects/:id/context-sources?stage=`. Rejected — POST matches explicit operator actions and avoids cache ambiguity for a potentially expensive walk.
- *Alternative considered:* nest under `/configuration/...`. Rejected — resolution consumes configuration; it is not a configuration CRUD verb.

### D8 — Modular monolith boundaries

Implement inside existing `apps/api` `ProjectsModule`:

- `ContextSourceResolutionService` (or equivalent): `resolve(projectId, stage)`
- Pure matcher/walker helpers unit-testable without Nest (ports/adapters for `fs` / `lstat` if needed)
- Shared DTOs/type guards in `packages/shared-contracts`
- No new Nx domain package; boundaries unchanged (web → shared-contracts only; API must not import web)
- Lock `picomatch` (and `@types/picomatch` if required) at the workspace/API dependency set; regenerate `package-summary.json`

- *Alternative considered:* new `ContextModule`. Deferred — single consumer under projects until a second consumer appears.

### D9 — Minimal Angular resolve outcomes

Extend the existing Spanish-first console (same project selection pattern as configuration/discovery):

- Stage selector (closed four stages) + “Resolver fuentes de contexto” (or equivalent) action when a project is selected.
- API responses keep the **full** `paths` array. UI presentation:
  - Show at most the **first 200** paths, preserving server order.
  - When `pathCount > 200`, show copy equivalent to `Mostrando 200 de N rutas`.
  - Do **not** add pagination, an additional endpoint, content reading, or per-path follow-up calls in this slice.
- On success: show stage, `pathCount`, configuration hash short prefix, and the bounded path list. MUST NOT open or display file contents.
- States: idle (no resolve yet), loading, success including **explicit empty success** (`pathCount === 0`), blocked/error (API `message`/`code`).
- Copy states read-only path resolution; no preview/approve/send actions.

- *Alternative considered:* API-only. Rejected — US-003 requires operator-visible console outcomes.
- *Alternative considered:* server-side truncation to 200. Rejected — API returns full paths (within D5 bounds); UI caps display only.

### D10 — Test strategy and evidence

Jest + existing Testcontainers PostgreSQL pattern:

1. **Unit — matcher/walker / globs:** include hit; exclude wins; `dot: true` dotfile fixtures; case-sensitivity (mismatch does not match); leading `!` is not negation; absolute pattern → `invalid_context_patterns`; backslash → `invalid_context_patterns`; `..` segment → `invalid_context_patterns`; NUL/empty-after-trim → `invalid_context_patterns`.
2. **Unit — symlinks:** out-of-tree symlink → entire resolve blocked `context_path_escape` with no partial paths; in-tree symlink omitted (not followed, not returned); symlink counts toward visited entries; only regular files are candidates.
3. **Unit — `.git` / nested repo:** `.git` file or directory omitted but counted; other dot entries considered; nested repo as regular directory walked; nested `.git` omitted; no Git commands invoked.
4. **Unit — mandatory excludes:** snapshot missing one mandatory exclude still applies it in effective set; `exclude` in ok DTO equals effective set; persisted `normalizedConfig` unchanged.
5. **Unit — bounds:** visit limit, match limit, UTF-8 combined path-byte limit → `context_resolution_limit_exceeded` without truncation; timeout → `context_resolution_timeout`; never reads file contents (spy).
6. **Unit — stage validation:** each closed stage accepted; unknown/missing → `invalid_review_stage`.
7. **API/integration:** register attached config → resolve 200 with expected fixture paths; resolve matching nothing → 200 empty; no configuration → 422 `configuration_not_found`; missing repo path → 422 without walking; unknown project → 404; invalid stage → 422; `EACCES`/`EPERM` fixture → 422 `context_entry_unreadable`; unexpected injected failure → 500 `context_resolve_failed` without path leakage.
8. **Web:** idle/loading/success/empty/blocked; display cap of 200 paths with “Mostrando 200 de N rutas” when `pathCount > 200`; stage selection required; no content fetch.
9. Quality gates must `PASS` before commit/push. Capture evidence under this change’s `evidence/`.

Integration fixtures SHOULD use temporary directories with a minimal `.specpilot/project.yaml` and a small file tree—avoid depending on the SpecPilot monorepo itself as the only fixture.

### D11 — Security, privacy, observability

- Read-only filesystem enumeration under canonical `repositoryPath` using `lstat` (no automatic symlink follow).
- Out-of-tree symlink → fail closed `context_path_escape`; in-tree symlink → omit (no walk into target, no candidate).
- Never read candidate file bytes in this slice (no hashes, sizes, mtimes, tokens, or content).
- Defensive mandatory exclude union ensures secret-bearing path patterns cannot become candidates even if a legacy snapshot omitted them; do not mutate persisted configuration.
- Absolute `repositoryPath` remains DB-only; 422/500 client errors MUST NOT leak stacks, patterns, or absolute host paths beyond existing registration messaging style.
- Log project id, stage, error `code`, pathCount on success; do not log full path lists at info level if large (debug optional locally).
- No authentication change.
- Reuse Compose authorized read-only host root (`SPECPILOT_HOST_REPOS_ROOT`) — no new mount policy.
- No DeepSeek / external network calls from resolve.
- No repository mutation; no Git subprocesses for submodule detection.

### D12 — Relationship to later Wave 2 slices

| Later slice | Consumes this slice as |
|---|---|
| `w02-s02` | Candidate path list to scan for secret *content* |
| `w02-s03` | Path list (+ later content selection) to build immutable manifests/hashes/tokens |
| `w02-s04` | Manifest/path set for operator preview/approval |

This slice MUST NOT implement those behaviors “early.”

### D13 — Docs and lifecycle

Update `docs/context/**` and package summary if dependencies change. Document operator resolve flow. Sync/archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [Same path set for every stage until YAML overlays exist] → Accepted for this slice; stage is still required identity; document Non-Goal; revisit when product needs differentiated profiles.
- [Large repositories / slow walks / huge path payloads] → Hard visit/match/UTF-8/time bounds; fail closed on exceed; `.git` omit reduces noise.
- [Glob semantics surprises (`*` vs `**`, dotfiles, `!`)] → Pin picomatch options (`dot`/`nocase`/`nonegate`); unit fixtures for binding cases.
- [Symlink cycles / aliases] → Never follow symlinks into walk; out-of-tree → `context_path_escape`; in-tree → omit.
- [Legacy snapshots missing mandatory excludes] → Defensive union at resolve time; ok DTO returns effective excludes; persisted snapshot untouched.
- [Operators expecting file content preview] → UI copy + Non-Goals; paths/count only; UI display cap 200.
- [UI truncation vs API completeness] → API returns full paths within D5; Angular shows first 200 only—document clearly.
- [Scope creep into secret scanning or manifests] → Explicit exclusions; tasks reject content read/hash/token/DeepSeek.
- [Compose API cannot see host paths] → Existing override mount; no new mount invention; native macOS API needs no mount.
- [Unreadable entries mid-walk] → 422 `context_entry_unreadable`; no partial results.
- [Unexpected infra confused with expected blocks] → 500 `context_resolve_failed` outside the 422 blocked union.

## Migration Plan

1. Add shared-contracts review-stage + resolve DTOs, closed 422 blocked-code union (without `context_resolve_failed`), 500 `context_resolve_failed` on `ProjectErrorResponse`, and type guards.
2. Add pinned `picomatch` dependency; regenerate package summary.
3. Implement walker/matcher (`lstat`, symlink/`.git`/mandatory-exclude policy) + `ContextSourceResolutionService` in `ProjectsModule` (no Prisma migration).
4. Add `POST /projects/:id/context-sources/resolve`.
5. Extend Angular console with stage selector + resolve outcomes (Spanish-first; display cap 200).
6. Add unit + Testcontainers + web tests covering D10 fixtures; write `evidence/` artifacts.
7. Run `npm run quality-gates`; update docs/context and package summary as needed.
8. Operator-approved commit/push on `main` after reported validations.
9. Operator-approved Verify exactly `PASS`, sync, archive.

**Rollback:** revert slice commits on `main`; no DB migration to roll back for this slice; never touch foreign Docker resources (e.g. `axioma-db-dev`).

## Open Questions

None blocking. Per-stage YAML overlays are explicitly deferred (D2) until a later approved change demonstrates the need.
