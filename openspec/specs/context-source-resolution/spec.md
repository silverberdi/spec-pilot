# context-source-resolution

## Purpose

Resolve ephemeral, stage-scoped candidate context source file paths for a registered project from its active configuration snapshot and local repository tree, without reading file contents or persisting resolve results.

## Requirements

### Requirement: Resolve stage-specific context source sets for registered projects
The system SHALL resolve a deterministic candidate file-path set for a registered project and a requested review stage from the project's active `ProjectConfigurationVersion` and the local registered repository tree. Review stages MUST be exactly the closed union `new` | `planning` | `applied` | `verify`. Every stage MUST use the same configured source profile: `normalizedConfig.context.include` plus the effective exclude set defined by this capability. The system MUST NOT expand `schemaVersion: 1` with per-stage YAML overlays in this change. Resolution MUST be ephemeral (no Prisma persistence of resolved path sets). Resolution MUST remain read-only toward the target repository and MUST NOT read candidate file bytes, compute content hashes, estimate tokens, transmit payloads to DeepSeek or any external provider, execute Git or OpenSpec delivery commands, or mutate repository files.

#### Scenario: Successful resolve returns sorted candidate paths
- **WHEN** an operator resolves context sources for a registered project that has an active configuration and a readable repository tree matching the include patterns
- **THEN** the system returns HTTP 200 with `status` `ok`, the requested `stage`, `configurationVersionId`, `sourceHash`, sorted repository-relative `paths`, and `pathCount` equal to `paths.length`

#### Scenario: Empty match is explicit success
- **WHEN** include and effective exclude patterns yield no candidate regular files
- **THEN** the system returns HTTP 200 with `status` `ok`, `paths` as an empty array, and `pathCount` 0

#### Scenario: All four stages use the same path set for identical trees
- **WHEN** the same project and repository tree are resolved for each of `new`, `planning`, `applied`, and `verify` with unchanged configuration
- **THEN** each success response echoes its own `stage` and the `paths` arrays are identical across stages

#### Scenario: Resolution does not persist or mutate
- **WHEN** a successful or blocked resolve completes
- **THEN** no resolution snapshot table/column is written, `ProjectConfigurationVersion.normalizedConfig` is unchanged, and no files under the registered repository are created, modified, or deleted

### Requirement: Require active configuration and valid stage before walking
Context-source resolution MUST require an active `configurationVersionId` pointing at a persisted `ProjectConfigurationVersion`. Missing or unsupported stage MUST fail closed before walking. Unknown projects MUST return HTTP 404. Hard repository path failures MUST return HTTP 422 without walking.

#### Scenario: Unknown project returns 404
- **WHEN** `POST /projects/:id/context-sources/resolve` targets an unknown project id
- **THEN** the response is HTTP 404 with `code` `project_not_found`

#### Scenario: Missing active configuration returns 422
- **WHEN** the project exists but `configurationVersionId` is null
- **THEN** the response is HTTP 422 with blocked `code` `configuration_not_found` and no filesystem walk is performed

#### Scenario: Invalid stage returns 422
- **WHEN** the request body omits `stage` or supplies a value outside `new` | `planning` | `applied` | `verify`
- **THEN** the response is HTTP 422 with blocked `code` `invalid_review_stage` and `stage` null

#### Scenario: Unusable repository path returns 422
- **WHEN** the stored `repositoryPath` is missing, not a directory, or not readable
- **THEN** the response is HTTP 422 with `repository_not_found`, `repository_not_directory`, or `repository_not_readable` respectively and no candidate paths are returned

### Requirement: Enforce binding symlink and walk policy with lstat
The walk MUST use `lstat` or equivalent semantics that do not follow symlinks automatically. Every encountered entry including symlinks and omitted `.git` entries MUST count toward the visited-entry bound. For each symlink, the system MUST resolve the target only to check containment under the canonical `repositoryPath`. An out-of-tree symlink MUST block the entire resolve with HTTP 422 `context_path_escape` and MUST NOT return partial results. An in-tree symlink MUST be omitted: the walk MUST NOT enter its destination and MUST NOT return the symlink as a candidate. Only regular files discovered directly during the walk MAY become candidates. The system MUST NOT follow file or directory symlinks into the walk.

#### Scenario: Out-of-tree symlink blocks entire resolve
- **WHEN** the walk encounters a symlink whose target resolves outside the canonical repository path
- **THEN** the response is HTTP 422 with `code` `context_path_escape` and no path list is returned

#### Scenario: In-tree symlink is omitted
- **WHEN** the walk encounters a symlink whose target resolves inside the canonical repository path
- **THEN** the symlink is not returned as a candidate and its destination is not traversed as a follow

#### Scenario: Only regular files are candidates
- **WHEN** the walk encounters directories and regular files under include patterns
- **THEN** only matching regular files appear in `paths` and directories are never candidates

### Requirement: Omit .git entries and walk nested repositories without Git commands
The walk MUST omit any entry whose path segment is exactly `.git` (file or directory). The omitted entry MUST count as a visited filesystem entry but MUST NOT be traversed or returned. Other dotfiles and directories MUST be considered normally. A nested repository present as a regular directory MUST be walked as part of the tree subject to include/exclude and bounds, with its `.git` metadata omitted by the same rule. The resolver MUST NOT execute Git commands to detect submodules.

#### Scenario: .git directory is omitted but counted
- **WHEN** a `.git` directory exists under the repository root during resolve
- **THEN** it is not traversed or returned as a candidate and still increments the visited-entry count

#### Scenario: Nested repository is walked without Git detection
- **WHEN** a nested directory tree contains its own `.git` metadata and includable regular files
- **THEN** includable regular files may become candidates, the nested `.git` entry is omitted, and no Git subprocess is invoked for submodule detection

### Requirement: Apply defensive mandatory excludes without mutating snapshots
Although `normalizedConfig.context.exclude` is expected to already contain mandatory secret-path excludes, the resolver MUST defensively union exactly these patterns into the effective exclude set used for matching: `**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/secrets/**`. The system MUST NOT modify `ProjectConfigurationVersion` or persisted `normalizedConfig`. The effective exclude set MUST be deduplicated with stable order: snapshot excludes in stored order, then any missing mandatory patterns appended in the order listed above. Success responses MUST return the effective exclude set in `exclude`. No legacy or inconsistent snapshot MAY allow those secret-bearing path patterns to become candidates.

#### Scenario: Missing mandatory exclude is still applied
- **WHEN** an active snapshot's `context.exclude` omits at least one mandatory secret-path pattern and a matching secret-bearing file would otherwise be included
- **THEN** that file is not a candidate, the success `exclude` array contains the effective set including the missing mandatory pattern, and the persisted `normalizedConfig` is unchanged

#### Scenario: Effective excludes are returned on success
- **WHEN** resolve succeeds
- **THEN** `exclude` equals the effective exclude set actually used for matching

### Requirement: Enforce binding picomatch glob semantics and pattern validation
Matching MUST use a pinned `picomatch` dependency with options conceptually equivalent to `{ dot: true, nocase: false, nonegate: true }`. Matching MUST be case-sensitive, use only `/` as path and pattern separators, and MUST NOT rewrite Windows paths. Include and exclude are independent lists; a leading `!` MUST NOT act as negation. A regular file is a candidate iff it matches at least one include pattern and matches no exclude pattern; exclude always wins. The system MUST reject with HTTP 422 `invalid_context_patterns` when any include or exclude pattern is empty after trim, contains NUL, is absolute, contains a backslash, contains a `..` segment, or cannot be compiled under the binding options. Candidate paths MUST be repository-relative with `/` separators, without leading `./`, without absolute paths, sorted by exact JavaScript `a < b` comparison, and MUST NOT be produced by reading file contents.

#### Scenario: Exclude wins over include
- **WHEN** a regular file matches both an include pattern and an exclude pattern
- **THEN** the file is not present in `paths`

#### Scenario: Dotfiles match when included
- **WHEN** `dot: true` matching is active and an include pattern targets a dotfile that is not excluded
- **THEN** that regular file may appear in `paths`

#### Scenario: Leading exclamation is not negation
- **WHEN** an include or exclude pattern begins with `!`
- **THEN** it is not treated as a negated pattern under `nonegate: true`

#### Scenario: Invalid patterns are rejected
- **WHEN** a pattern is empty after trim, contains NUL, is absolute, contains `\`, or contains a `..` segment
- **THEN** the response is HTTP 422 with `code` `invalid_context_patterns` and no partial path list is returned

#### Scenario: Paths are deterministic and content-free
- **WHEN** the same configuration and tree are resolved twice successfully
- **THEN** `paths` are identical, sorted by `a < b`, repository-relative with `/`, and no candidate file bytes were read

### Requirement: Enforce visit match payload and time bounds without truncation
The system MUST enforce maximum **100000** filesystem entries visited, maximum **20000** matched files returned, maximum **4194304** combined UTF-8 bytes of returned path strings (sum of `Buffer.byteLength(path, 'utf8')` or equivalent), and maximum **15000** ms wall time per resolve. Exceeding visit, match, or UTF-8 payload bounds MUST return HTTP 422 `context_resolution_limit_exceeded`. Exceeding the time bound MUST return HTTP 422 `context_resolution_timeout`. The system MUST NOT return a truncated or partial `ok` path list when any bound is exceeded.

#### Scenario: Match or payload limit blocks without truncation
- **WHEN** matched files would exceed 20000 or combined UTF-8 path bytes would exceed 4194304
- **THEN** the response is HTTP 422 with `code` `context_resolution_limit_exceeded` and no partial `paths` array is returned as success

#### Scenario: Visit limit blocks without truncation
- **WHEN** visited filesystem entries would exceed 100000
- **THEN** the response is HTTP 422 with `code` `context_resolution_limit_exceeded` and no partial success path list is returned

#### Scenario: Timeout blocks without truncation
- **WHEN** resolve exceeds 15000 ms wall time
- **THEN** the response is HTTP 422 with `code` `context_resolution_timeout` and no partial success path list is returned

### Requirement: Expose POST context-sources resolve with closed error contracts
The system MUST expose `POST /projects/:id/context-sources/resolve` accepting `{ stage: ReviewStage }`. Successful resolves MUST return HTTP 200 `ContextSourceResolveOkDto`. Expected refusals MUST return HTTP 422 `ContextSourceResolveBlockedDto` whose `code` is exactly one of: `invalid_review_stage`, `configuration_not_found`, `invalid_context_patterns`, `context_path_escape`, `context_entry_unreadable`, `context_resolution_limit_exceeded`, `context_resolution_timeout`, `repository_not_found`, `repository_not_directory`, `repository_not_readable`. `EACCES` or `EPERM` while reading metadata or listing a walk entry MUST return HTTP 422 `context_entry_unreadable` with no partial results. Unexpected filesystem, Prisma, or infrastructure failures MUST return HTTP 500 `ProjectErrorResponse` with `code` `context_resolve_failed`, a safe message, and MUST NOT leak paths, stack traces, patterns, or absolute host paths. `context_resolve_failed` MUST NOT be a member of the HTTP 422 blocked-code union. The system MUST NOT provide a persisted last-resolve GET endpoint in this change.

#### Scenario: Resolve endpoint returns ok DTO on success
- **WHEN** `POST /projects/:id/context-sources/resolve` succeeds
- **THEN** HTTP 200 body includes `status` `ok`, `stage`, `configurationVersionId`, `sourceHash`, `resolvedAt`, `include`, effective `exclude`, `pathCount`, and full sorted `paths`

#### Scenario: Unreadable walk entry returns 422
- **WHEN** metadata read or directory listing during the walk fails with `EACCES` or `EPERM`
- **THEN** the response is HTTP 422 with `code` `context_entry_unreadable` and no partial path list is returned

#### Scenario: Unexpected infrastructure returns 500
- **WHEN** an unexpected filesystem, Prisma, or infrastructure failure occurs during resolve
- **THEN** the response is HTTP 500 with `code` `context_resolve_failed` and a safe message without paths, stack, pattern, or absolute host path leakage

### Requirement: Keep Wave 2 later-slice behaviors out of resolve
Context-source resolution MUST NOT perform secret-content detection, build immutable context-bundle manifests, estimate tokens, preview file contents, require approval gates, or call DeepSeek. Those behaviors remain later-slice scope.

#### Scenario: Resolve does not open file contents for scanning or preview
- **WHEN** resolve enumerates candidate paths
- **THEN** candidate file contents are not read for secret scanning, hashing, token estimation, or preview display
