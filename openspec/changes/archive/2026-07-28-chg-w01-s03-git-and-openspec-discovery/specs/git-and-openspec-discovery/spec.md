## ADDED Requirements

### Requirement: Persist latest discovery snapshot and lastInspectedAt atomically
The system SHALL persist the latest discovery result on `Project` as nullable JSON `lastDiscovery` and SHALL update nullable `lastInspectedAt` only when a discovery refresh cycle completes. Updating `lastDiscovery` and `lastInspectedAt` MUST occur in a single PostgreSQL transaction. `lastDiscovery.inspectedAt` MUST equal `lastInspectedAt`. The system MUST NOT introduce an immutable discovery-version history table in this capability. Hard failures (`project_not_found`, `repository_not_found`, `repository_not_directory`, `repository_not_readable`) and unexpected mid-refresh failures (`discovery_refresh_failed`) MUST NOT update either field.

#### Scenario: Successful completed cycle persists both fields
- **WHEN** discovery refresh completes for a project whose repository path is usable
- **THEN** `lastDiscovery` and `lastInspectedAt` are updated together and `lastDiscovery.inspectedAt` equals `lastInspectedAt`

#### Scenario: Hard path failure leaves fields unchanged
- **WHEN** discovery refresh fails because the stored repository path is missing, not a directory, or not readable
- **THEN** the response is HTTP 422 with the matching repository code and neither `lastDiscovery` nor `lastInspectedAt` is updated

#### Scenario: Unexpected mid-refresh failure leaves fields unchanged
- **WHEN** an unexpected infrastructure failure occurs during discovery refresh after hard-path checks succeeded
- **THEN** the response is HTTP 500 with `code` `discovery_refresh_failed` and neither field is updated

### Requirement: Completed cycles persist blocked subsystem outcomes
When repository hard-path checks succeed, the system MUST complete a composite inspection producing Git and OpenSpec subsystem outcomes that are each either `status: 'ok'` or `status: 'blocked'` with a closed machine-readable code. The system MUST return HTTP 200 with `ProjectDiscoveryDto` and MUST persist the snapshot even when one or both subsystems are blocked. Discovery MUST NOT require an active `configurationVersionId`.

#### Scenario: Non-git repository still returns 200 and persists
- **WHEN** refresh runs against a readable registered directory that is not a Git work tree
- **THEN** the response is HTTP 200 with `git.status` `blocked` and `code` `not_a_git_repository`, and the composite snapshot is persisted

#### Scenario: OpenSpec limit exceeded still returns 200 and persists
- **WHEN** OpenSpec inspection exceeds the active-change or specs-entry bound
- **THEN** the response is HTTP 200 with `openspec.status` `blocked` and `code` `openspec_inspection_limit_exceeded`, and the snapshot is persisted

#### Scenario: Discovery does not require active configuration
- **WHEN** refresh runs for a registered project whose `configurationVersionId` is null
- **THEN** discovery still proceeds and is not blocked solely for missing configuration

### Requirement: Allowlisted read-only Git inspection
Git inspection MUST use Node `child_process.execFile` only (never `exec`, never shell) with `cwd` equal to the canonical `repositoryPath`. Each required command MUST use timeout **5000** ms and maxBuffer **1048576** bytes. Every Git invocation MUST set `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, and `LC_ALL=C`. The system MUST NOT accept operator-provided flags, commands, pathspecs, revisions, or environment values. Allowlisted argv are limited to: `git rev-parse --is-inside-work-tree`; `git rev-parse --abbrev-ref HEAD`; `git rev-parse HEAD`; `git status --porcelain=v1`; and optionally `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`. On Git ok: `isRepo` MUST be true; successful `headSha` MUST be exactly 40 lowercase hexadecimal characters or null only for confirmed unborn HEAD; `branch` MUST be null only for detached HEAD otherwise a non-empty branch name; `dirty` MUST reflect non-empty porcelain output; missing upstream MUST yield `upstream: null` without blocking. Blocked Git codes MUST be exactly one of `not_a_git_repository`, `git_inspect_failed`, or `git_inspection_timeout`. Required-command timeout MUST map to `git_inspection_timeout`.

#### Scenario: Valid work tree yields ok Git discovery
- **WHEN** refresh inspects a registered Git work tree with a valid HEAD and branch
- **THEN** `git.status` is `ok`, `headSha` is 40 lowercase hex characters, `branch` is a non-empty name, and `dirty` is a boolean

#### Scenario: Non-repository maps to not_a_git_repository
- **WHEN** `git rev-parse --is-inside-work-tree` does not confirm a work tree
- **THEN** `git.status` is `blocked` with `code` `not_a_git_repository`

#### Scenario: Required Git timeout maps to git_inspection_timeout
- **WHEN** a required Git command exceeds 5000 ms
- **THEN** `git.status` is `blocked` with `code` `git_inspection_timeout`

#### Scenario: Missing upstream does not block
- **WHEN** upstream resolution fails but required Git checks succeed
- **THEN** `git.status` remains `ok` and `upstream` is null

### Requirement: Filesystem-primary OpenSpec discovery with containment and bounds
OpenSpec discovery MUST inspect the target repository filesystem read-only under the canonical `repositoryPath`. Before inspecting `openspec`, `changes`, `archive`, active change directories, `specs` directories, or candidate spec files, paths MUST be resolved safely and MUST remain equal to or below the canonical `repositoryPath`. The system MUST NOT follow a symlink that resolves outside that boundary, MUST NOT inspect outside that boundary, MUST NOT follow symbolic links during traversal, and MUST NOT ingest file contents (names, metadata, and existence only). Presence checks MUST count regular files or regular directories as appropriate. A detected escape MUST block OpenSpec with `openspec_path_escape`. Maximum active change directories inspected per refresh MUST be **500**. Maximum filesystem entries visited below all active changes' `specs/` directories combined MUST be **10000**. Archive discovery MUST count immediate regular directories under `openspec/changes/archive/` only and MUST NOT recurse. Exceeding a bound MUST block OpenSpec with `openspec_inspection_limit_exceeded`. Missing `openspec` regular directory MUST block with `openspec_root_missing`. Unexpected filesystem errors MUST use `openspec_inspect_failed`. Empty active changes with a valid OpenSpec root MUST remain `status: 'ok'`.

#### Scenario: Missing openspec root is blocked
- **WHEN** the registered repository has no `openspec` regular directory inside the containment boundary
- **THEN** `openspec.status` is `blocked` with `code` `openspec_root_missing`

#### Scenario: Empty active changes remain ok
- **WHEN** `openspec` exists and `openspec/changes` has no active change directories (excluding archive)
- **THEN** `openspec.status` is `ok`, `activeChanges` is empty, and `archivedChangeCount` reflects immediate archive directories

#### Scenario: Symlink escape is blocked
- **WHEN** OpenSpec inspection detects a path that resolves outside the canonical repository
- **THEN** `openspec.status` is `blocked` with `code` `openspec_path_escape` and the escape target is not inspected

#### Scenario: Active change bound exceeded is blocked
- **WHEN** more than 500 immediate active change directories exist under `openspec/changes` excluding archive
- **THEN** `openspec.status` is `blocked` with `code` `openspec_inspection_limit_exceeded`

### Requirement: Exact OpenSpec artifact presence rules
Active change names MUST come only from immediate regular directories under `openspec/changes` excluding `archive`. For each inspected active change: `hasProposal` MUST be true only when `proposal.md` is a regular file directly under the change directory; `hasDesign` only for direct regular `design.md`; `hasTasks` only for direct regular `tasks.md`; `hasSpecs` MUST be true only when at least one regular file matches `openspec/changes/<change>/specs/<capability>/spec.md`. Arbitrary Markdown files under `specs/` MUST NOT satisfy `hasSpecs`.

#### Scenario: Capability spec.md sets hasSpecs
- **WHEN** an active change contains a regular file at `specs/<capability>/spec.md`
- **THEN** that change's `hasSpecs` is true

#### Scenario: Arbitrary markdown under specs does not set hasSpecs
- **WHEN** an active change contains Markdown under `specs/` but no `specs/<capability>/spec.md` regular file
- **THEN** that change's `hasSpecs` is false

#### Scenario: Nested proposal does not set hasProposal
- **WHEN** `proposal.md` exists only in a subdirectory of the active change and not as a direct regular file
- **THEN** `hasProposal` is false

### Requirement: Optional local OpenSpec CLI enrichment without PATH
Filesystem discovery remains authoritative. Optional CLI enrichment MUST use only `<repositoryPath>/node_modules/.bin/openspec` after confirming it resolves to a regular executable file inside the canonical repository path. The system MUST NOT resolve or execute a global `openspec` from PATH. Invocation MUST use `execFile` (never shell) with fixed argv equivalent to `openspec list --json`, `cwd` equal to the canonical `repositoryPath`, timeout **5000** ms, and maxBuffer **1048576** bytes. If the binary is absent, `cliAvailable` MUST be false and filesystem discovery MUST continue successfully. If the binary exists but times out, fails, or returns unusable JSON, filesystem discovery MUST continue, `cliAvailable` MUST be false, and the failure MUST be logged safely. CLI failure alone MUST NEVER block a filesystem-successful OpenSpec discovery. The system MUST NEVER invoke `new`, `apply`, `verify`, `sync`, `archive`, `update`, or any other OpenSpec command.

#### Scenario: Absent local CLI does not block filesystem success
- **WHEN** `<repositoryPath>/node_modules/.bin/openspec` is absent and filesystem OpenSpec inspection succeeds
- **THEN** `openspec.status` is `ok` and `cliAvailable` is false

#### Scenario: Failed local CLI does not block filesystem success
- **WHEN** the local CLI exists but times out, fails, or returns unusable JSON while filesystem inspection succeeds
- **THEN** `openspec.status` is `ok`, `cliAvailable` is false, and discovery is not blocked solely for CLI failure

#### Scenario: PATH openspec is never used
- **WHEN** a global `openspec` exists on PATH but the local `node_modules/.bin/openspec` is absent
- **THEN** the system does not execute the PATH binary and `cliAvailable` is false

### Requirement: Explicit discovery refresh and get endpoints
The system MUST expose `POST /projects/:id/discovery/refresh` and `GET /projects/:id/discovery`. Successful completed refresh MUST return HTTP 200 with `ProjectDiscoveryDto` and persist `lastDiscovery` plus `lastInspectedAt`. Hard path failures MUST return HTTP 422 with `repository_not_found`, `repository_not_directory`, or `repository_not_readable` without field updates. Unknown project MUST return HTTP 404 with `project_not_found`. Unexpected mid-refresh failures MUST return HTTP 500 with `discovery_refresh_failed` and a safe message that MUST NOT expose stack traces or extra internal paths. `GET /projects/:id/discovery` MUST return HTTP 200 with the persisted `ProjectDiscoveryDto` when present, HTTP 404 with `project_not_found` when the project is missing, and HTTP 404 with `discovery_not_found` when the project exists but was never inspected. `GET /projects` and `GET /projects/:id` MUST NOT embed the full discovery blob. Registration and configuration endpoints MUST remain behaviorally unchanged (registration still returns `lastInspectedAt: null` until first discovery refresh). The system MUST NOT mutate the target repository and MUST NOT execute delivery or Git-write workflows.

#### Scenario: Refresh success returns ProjectDiscoveryDto
- **WHEN** `POST /projects/:id/discovery/refresh` completes for an existing project with a usable repository path
- **THEN** the response is HTTP 200 with `ProjectDiscoveryDto` and persisted `lastInspectedAt` is non-null

#### Scenario: Get before first refresh returns discovery_not_found
- **WHEN** `GET /projects/:id/discovery` is requested for a project that has never been inspected
- **THEN** the response is HTTP 404 with `code` `discovery_not_found`

#### Scenario: Target repository remains unmodified
- **WHEN** discovery refresh or get runs against a local repository
- **THEN** no file in that repository is created, modified, or deleted by SpecPilot

### Requirement: Closed discovery code unions in shared contracts
Shared contracts MUST define closed unions: Git blocked codes exactly `not_a_git_repository` | `git_inspect_failed` | `git_inspection_timeout`; OpenSpec blocked codes exactly `openspec_root_missing` | `openspec_inspect_failed` | `openspec_path_escape` | `openspec_inspection_limit_exceeded`; hard/API codes including `project_not_found`, `repository_not_found`, `repository_not_directory`, `repository_not_readable`, `discovery_not_found`, and `discovery_refresh_failed`. Type guards MUST reject unknown codes and ambiguous `git` / `openspec` union shapes.

#### Scenario: Unknown Git blocked code is rejected
- **WHEN** a shared-contracts type guard receives a Git blocked payload with an unknown `code`
- **THEN** validation fails and MUST NOT treat the payload as a valid `ProjectDiscoveryDto`

#### Scenario: Ambiguous openspec union is rejected
- **WHEN** a shared-contracts type guard receives an OpenSpec payload with `status` `ok` and a blocked `code`, or `blocked` without `code`
- **THEN** validation fails

### Requirement: Minimal Spanish-first discovery console outcomes
`apps/web` MUST expose a minimal Spanish-first discovery outcomes surface (not a multi-project discovery-health dashboard) with explicit empty, loading, success, and blocked/error outcomes driven by the discovery API. The surface MUST provide an explicit refresh action for a known project id and MUST show last inspection time when present plus Git and OpenSpec summaries after refresh or get. The surface MUST NOT claim delivery execution capability.

#### Scenario: Empty never-inspected state
- **WHEN** the discovery surface loads for a known project that has never been inspected
- **THEN** an empty/never-inspected outcome is shown with a ready refresh action

#### Scenario: Loading state during refresh
- **WHEN** `POST /projects/:id/discovery/refresh` is in flight
- **THEN** a loading state is presented and refresh is not treated as complete

#### Scenario: Success state shows Git and OpenSpec summaries
- **WHEN** refresh returns HTTP 200 with ok or blocked subsystem outcomes
- **THEN** the UI shows inspection time and Git/OpenSpec summaries without claiming target-repository mutation

#### Scenario: Hard API error surfaces operator message
- **WHEN** refresh returns HTTP 422 or 500 with `{ code, message }`
- **THEN** the UI shows the blocked/error outcome using the operator-facing message
