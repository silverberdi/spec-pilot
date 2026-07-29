# local-project-registration

## Purpose

Register and validate local macOS repositories as durable Project records with realpath-canonical identity, presence-only `.specpilot/project.yaml` checks, and operator-visible API/console outcomes.

## Requirements

### Requirement: Register eligible local repositories as durable Project records
The system SHALL register a local macOS repository as a durable `Project` when registration eligibility succeeds. Eligibility remains presence-only as defined by this capability's preflight requirements. On eligibility success the system MUST insert the `Project` first, then attempt configuration attach as defined by `project-yaml-configuration`. The `Project` MUST NOT be rolled back or deleted because of later attach failures. On success, `POST /projects` MUST return HTTP 201 with `RegisterProjectResponse`: a `ProjectDto` containing `id`, `slug`, `displayName`, `repositoryPath`, `status`, `registeredAt`, `lastInspectedAt`, `configurationVersionId`, and required `discoveryHealth`, plus a required `configuration` discriminated outcome. Initial `status` MUST be `registered`. `lastInspectedAt` MUST be null on registration success; `git-and-openspec-discovery` MAY set `lastInspectedAt` and `lastDiscovery` afterward via explicit discovery refresh. Registration MUST NOT auto-run discovery. On registration success `discoveryHealth` MUST be the never-inspected outcome defined by `project-dashboard` (`status` `never_inspected`, `inspectedAt` null, both subsystem statuses `unknown`, `summaryMessage` null). When attach succeeds, `configuration.status` MUST be `attached`, `configuration.version` MUST be present, and `configurationVersionId` MUST equal `version.id`. When attach is blocked (expected validation/filesystem/size/parse failures or unexpected attach infrastructure failure), `configuration.status` MUST be `blocked`, `configuration.error` MUST be present with a machine-readable `code`, and `configurationVersionId` MUST be `null`. Unexpected attach failures MUST use `code` `configuration_attach_failed` with a safe message and MUST NOT insert a partial snapshot.

#### Scenario: Successful registration returns RegisterProjectResponse with attached configuration
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains a schema-valid `.specpilot/project.yaml` within size limits and no conflicting project exists
- **THEN** the system persists a `Project` row, persists a `ProjectConfigurationVersion`, responds with HTTP 201 `RegisterProjectResponse` where `configuration.status` is `attached`, and `configurationVersionId` equals `configuration.version.id`

#### Scenario: Registration succeeds with blocked configuration attach
- **WHEN** eligibility succeeds but configuration attach fails with an expected parse or schema error
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, a specific error `code`, `configurationVersionId` null, the `Project` row retained, and no configuration version row inserted

#### Scenario: Unexpected attach failure keeps the project and returns blocked attach code
- **WHEN** eligibility succeeds and an unexpected infrastructure failure occurs during configuration attach
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, `code` `configuration_attach_failed`, `configurationVersionId` null, no partial snapshot, and the registered `Project` retained

#### Scenario: Successful registration returns ProjectDto fields with null lastInspectedAt and never_inspected health
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains `.specpilot/project.yaml` as a regular file and no conflicting project exists
- **THEN** the system persists a `Project` row and responds with HTTP 201 including a `ProjectDto` whose `repositoryPath` is the canonical realpath, whose `status` is `registered`, whose `lastInspectedAt` is null, and whose `discoveryHealth.status` is `never_inspected`

#### Scenario: Registration does not auto-run discovery
- **WHEN** registration succeeds
- **THEN** discovery refresh is not invoked as part of registration and `lastDiscovery` remains unset until an explicit discovery refresh

### Requirement: Persisted repositoryPath uses filesystem realpath canonicalization
The system MUST validate that the received `repositoryPath` is absolute before filesystem work. After confirming the target exists, the system MUST obtain identity via filesystem realpath (following symlinks only to resolve the real target). The persisted `repositoryPath` MUST be the canonical absolute path of the real directory—not merely `path.resolve` and not the raw textual input. Trailing slashes and redundant segments MUST be removed by that canonicalization. Two different textual paths or symlinks that resolve to the same real directory MUST be treated as the same repository. The system MUST NOT store a symlink alternate path as an additional identity in this slice.

#### Scenario: Canonical realpath is persisted
- **WHEN** registration succeeds for a path that includes trailing slashes or redundant segments
- **THEN** the stored `repositoryPath` equals the filesystem realpath of the real directory without those textual artifacts

#### Scenario: Symlink alias collides with existing canonical path
- **WHEN** a repository is already registered under its canonical realpath and a different symlink path that realpaths to the same directory is submitted
- **THEN** registration is blocked as `duplicate_repository_path` with HTTP 409 and no new row is inserted

#### Scenario: Relative paths are rejected
- **WHEN** the operator submits a non-absolute `repositoryPath`
- **THEN** the system responds with HTTP 422 and `code` `relative_repository_path` without inserting a row

#### Scenario: Empty paths are rejected
- **WHEN** the operator submits an empty or whitespace-only `repositoryPath`
- **THEN** the system responds with HTTP 422 and `code` `empty_repository_path` without inserting a row

### Requirement: Registration preflight fails closed with presence-only YAML checks
Before insert, the system MUST confirm the path exists, obtain realpath, confirm the canonical target is a readable directory, and confirm `.specpilot/project.yaml` exists as a regular file inside the canonical directory. The system MUST NOT parse or schema-validate YAML contents in this capability. Filesystem operations MUST be read-only (`stat`/`access`/`realpath`-class); the system MUST NOT create, modify, or delete files in the target repository. Blocked eligibility outcomes MUST use HTTP 422 with the matching machine-readable `code` and MUST NOT create a partial row.

#### Scenario: Missing repository
- **WHEN** the absolute path does not exist
- **THEN** the response is HTTP 422 with `code` `repository_not_found` and no row is inserted

#### Scenario: Path is not a directory
- **WHEN** the absolute path exists but the canonical target is not a directory
- **THEN** the response is HTTP 422 with `code` `repository_not_directory` and no row is inserted

#### Scenario: Directory is not readable
- **WHEN** the canonical directory exists but is not readable
- **THEN** the response is HTTP 422 with `code` `repository_not_readable` and no row is inserted

#### Scenario: project.yaml missing
- **WHEN** the canonical directory lacks `.specpilot/project.yaml`
- **THEN** the response is HTTP 422 with `code` `project_yaml_missing` and no row is inserted

#### Scenario: project.yaml is not a regular file
- **WHEN** `.specpilot/project.yaml` exists under the canonical directory but is not a regular file
- **THEN** the response is HTTP 422 with `code` `project_yaml_not_regular_file` and no row is inserted

#### Scenario: Target repository remains unmodified
- **WHEN** registration preflight or persistence runs against a local repository
- **THEN** no file in that repository is created, modified, or deleted by SpecPilot

### Requirement: displayName and derived slug rules are binding
`displayName` is optional. The system MUST trim it. If omitted or empty after trim, the system MUST default `displayName` to the basename of the canonical directory. `displayName` MUST NOT exceed 120 characters after trim; over-length values MUST return HTTP 422 with `code` `invalid_display_name` and MUST NOT insert a row. `displayName` MUST NOT participate in uniqueness. `slug` MUST be derived from the basename of the canonical directory normalized to lowercase kebab-case. If a valid kebab-case slug cannot be derived, the system MUST return HTTP 422 with `code` `invalid_derived_slug` and MUST NOT insert a row.

#### Scenario: Default displayName from canonical basename
- **WHEN** registration succeeds without a `displayName` (or with whitespace-only after trim)
- **THEN** the persisted `displayName` equals the basename of the canonical directory

#### Scenario: Overlong displayName is blocked
- **WHEN** the trimmed `displayName` exceeds 120 characters
- **THEN** the response is HTTP 422 with `code` `invalid_display_name` and no row is inserted

#### Scenario: Invalid derived slug is blocked
- **WHEN** the canonical directory basename cannot yield a valid lowercase kebab-case slug
- **THEN** the response is HTTP 422 with `code` `invalid_derived_slug` and no row is inserted

#### Scenario: displayName does not enforce uniqueness
- **WHEN** two eligible repositories register with the same `displayName` but different canonical paths and slugs
- **THEN** both registrations succeed

### Requirement: Exact HTTP error and lookup contracts for projects
All blocked and error responses MUST use the stable body `{ "code": string, "message": string }` where `code` is machine-readable and `message` is operator-facing. Uniqueness conflicts MUST return HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug`. Unexpected filesystem, Prisma, or infrastructure failures that occur **before** the `Project` insert MUST return HTTP 500 with a safe generic payload and MUST NOT expose additional internal paths, stack traces, or file contents. Unexpected failures **during post-insert configuration attach** MUST NOT convert the registration into HTTP 500; they MUST follow the `RegisterProjectResponse` blocked attach contract with `configuration_attach_failed`. `GET /projects` MUST return the list of registered `ProjectDto` values (including `configurationVersionId` and `discoveryHealth`) ordered by `registeredAt` DESC then `id` ASC for empty-state and dashboard support. `GET /projects/:id` MUST return HTTP 200 with the enriched `ProjectDto` when found and HTTP 404 with `code` `project_not_found` when missing. Every `ProjectDto` returned by these endpoints MUST include `discoveryHealth` as defined by `project-dashboard`.

#### Scenario: Duplicate slug conflict
- **WHEN** registration would violate the unique `slug` constraint
- **THEN** the response is HTTP 409 with `code` `duplicate_project_slug` and no partial success row remains from the failed attempt

#### Scenario: Duplicate canonical path conflict
- **WHEN** registration would violate the unique `repositoryPath` constraint
- **THEN** the response is HTTP 409 with `code` `duplicate_repository_path`

#### Scenario: Safe 500 payload before project insert
- **WHEN** an unexpected infrastructure failure occurs during registration before the Project is inserted
- **THEN** the response is HTTP 500 with `{ code, message }` and does not include stack traces, extra internal paths, or file contents

#### Scenario: Get project by id success
- **WHEN** `GET /projects/:id` is requested for an existing project
- **THEN** the response is HTTP 200 with the corresponding `ProjectDto` including `configurationVersionId` and `discoveryHealth`

#### Scenario: Get project by id not found
- **WHEN** `GET /projects/:id` is requested for a missing id
- **THEN** the response is HTTP 404 with `code` `project_not_found`

#### Scenario: List projects for empty-state support
- **WHEN** `GET /projects` is requested and no projects are registered
- **THEN** the response is an empty array suitable for empty-registry UI state

#### Scenario: List projects uses stable registeredAt DESC ordering
- **WHEN** `GET /projects` is requested and multiple projects are registered
- **THEN** the response is ordered by `registeredAt` descending with `id` ascending as tie-breaker and each item includes `discoveryHealth`

### Requirement: Database unique constraints are the final concurrency guarantee
PostgreSQL unique constraints on `repositoryPath` and `slug` MUST be the final guarantee against concurrent registrations. Application prechecks MAY improve operator feedback but MUST NOT replace those constraints. Prisma unique-constraint violations MUST map deterministically to HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug` as appropriate. The system MUST NOT rely on check-then-insert alone without handling the uniqueness race.

#### Scenario: Concurrent insert loses uniqueness race
- **WHEN** two concurrent registration attempts target the same canonical path or slug and one insert wins
- **THEN** the losing attempt results in HTTP 409 with the corresponding duplicate `code` after the unique constraint rejects the insert

### Requirement: Minimal Spanish-first registration console outcomes
`apps/web` MUST expose a minimal Spanish-first project registration flow with explicit empty, loading, success, and blocked/error outcomes driven by the projects API contracts. On HTTP 201, the UI MUST present the `RegisterProjectResponse.configuration` outcome (attached summary versus blocked reason/`code`) and MUST NOT pretend configuration succeeded when `configuration.status` is `blocked`. Eligibility blocked or error responses (HTTP 422 or 409) MUST show the operator-facing `message` and MUST NOT pretend registration success. The surface MAY include an explicit configuration refresh action and an explicit discovery refresh action for a known project id that surfaces success, blocked subsystem, 422, and 500 outcomes. Multi-project discovery-health listing UI is delivered by `project-dashboard` and MAY coexist with this registration flow in the same console; registration outcomes MUST NOT claim delivery execution capability.

#### Scenario: Empty registry state
- **WHEN** the registration surface loads and `GET /projects` returns an empty list
- **THEN** empty-registry copy is shown with a ready registration form

#### Scenario: Loading state during register
- **WHEN** `POST /projects` is in flight
- **THEN** a loading state is presented and submit is not treated as complete

#### Scenario: Success state shows attached configuration
- **WHEN** `POST /projects` returns HTTP 201 with `configuration.status` `attached`
- **THEN** the registered project summary and attached configuration summary from the response body are shown

#### Scenario: Registration success with blocked configuration is explicit
- **WHEN** `POST /projects` returns HTTP 201 with `configuration.status` `blocked`
- **THEN** the UI shows the project as registered and shows the blocked configuration outcome using the operator-facing error message without claiming configuration success

#### Scenario: Eligibility blocked state surfaces API message
- **WHEN** `POST /projects` returns HTTP 422 or 409 with `{ code, message }`
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show registration success

### Requirement: Project-scoped context-source resolve endpoint is exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-sources/resolve` as defined by `context-source-resolution` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, or discovery refresh/get. Resolve MUST NOT run automatically on `POST /projects` or `GET /projects`.

#### Scenario: Resolve is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-sources/resolve` with a valid `{ stage }` for an existing project that has active configuration
- **THEN** the projects API routes the request to context-source resolution and returns the resolve success or blocked/error contract

#### Scenario: Registration and list do not auto-resolve context sources
- **WHEN** an operator registers a project or lists projects
- **THEN** context-source resolution is not invoked as part of those operations


### Requirement: Project-scoped secret-scan endpoint is exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-sources/secret-scan` as defined by `secret-detection-and-exclusion` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, or context-source resolve semantics. Secret scan MUST NOT run automatically on `POST /projects`, `GET /projects`, or `POST /projects/:id/context-sources/resolve`.

#### Scenario: Secret scan is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-sources/secret-scan` with a valid `{ stage }` for an existing project that has active configuration
- **THEN** the projects API routes the request to secret detection and returns the scan success or blocked/error contract

#### Scenario: Registration list and resolve do not auto-run secret scan
- **WHEN** an operator registers a project, lists projects, or resolves context sources
- **THEN** secret detection is not invoked as part of those operations

### Requirement: Project-scoped context-bundle endpoints are exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-bundles`, `GET /projects/:id/context-bundles/:bundleId`, and `GET /projects/:id/context-bundles?stage=<ReviewStage>&limit=1` as defined by `context-bundle-manifest` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, context-source resolve, or public secret-scan semantics. Context-bundle create MUST NOT run automatically on `POST /projects`, `GET /projects`, `POST /projects/:id/context-sources/resolve`, or `POST /projects/:id/context-sources/secret-scan`. No product update or delete endpoint for context bundles MUST be exposed.

#### Scenario: Context-bundle create is available for a registered project id
- **WHEN** an operator calls `POST /projects/:id/context-bundles` with a valid `{ stage }` for an existing project that has active configuration and clean candidates
- **THEN** the projects API routes the request to context-bundle creation and returns HTTP 201 ok or a blocked/error contract

#### Scenario: Registration list resolve and secret-scan do not auto-create bundles
- **WHEN** an operator registers a project, lists projects, resolves context sources, or runs secret scan
- **THEN** context-bundle creation is not invoked as part of those operations

### Requirement: Project-scoped disclosure preview and approval endpoints are exposed under projects
The registered-project API surface MUST expose `POST /projects/:id/context-bundles/:bundleId/preview`, `POST /projects/:id/context-bundles/:bundleId/disclosure-approvals`, `GET /projects/:id/context-bundles/:bundleId/disclosure-status`, and `GET /projects/:id/disclosure-approvals?stage=<ReviewStage>&limit=1` as defined by `context-preview-and-approval` without changing realpath identity, presence-only eligibility, registration create/list semantics, configuration attach/refresh/get, discovery refresh/get, context-source resolve, public secret-scan, or context-bundle create/get/latest semantics. Disclosure preview and approval MUST NOT run automatically on `POST /projects`, `GET /projects`, resolve, secret-scan, or context-bundle create. No product update or delete endpoint for preview sessions, disclosure approvals, or context bundles MUST be exposed.

#### Scenario: Preview is available for a registered project bundle
- **WHEN** an operator calls `POST /projects/:id/context-bundles/:bundleId/preview` for an existing project and bundle whose live files match entry hashes
- **THEN** the projects API routes the request to disclosure preview and returns HTTP 200 ok or a blocked/error contract

#### Scenario: Registration list resolve scan and bundle create do not auto-preview or approve
- **WHEN** an operator registers a project, lists projects, resolves context sources, runs secret scan, or creates a context bundle
- **THEN** disclosure preview session creation and disclosure approval are not invoked as part of those operations
