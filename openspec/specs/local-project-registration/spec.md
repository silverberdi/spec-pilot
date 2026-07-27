# local-project-registration

## Purpose

Register and validate local macOS repositories as durable Project records with realpath-canonical identity, presence-only `.specpilot/project.yaml` checks, and operator-visible API/console outcomes.

## Requirements

### Requirement: Register eligible local repositories as durable Project records
The system SHALL register a local macOS repository as a durable `Project` when registration eligibility succeeds. On success, `POST /projects` MUST return HTTP 201 with a `ProjectDto` containing `id`, `slug`, `displayName`, `repositoryPath`, `status`, `registeredAt`, and `lastInspectedAt`. Initial `status` MUST be `registered`. `lastInspectedAt` MUST be null until a later discovery slice sets it. `ProjectConfigurationVersion` and configuration snapshot linkage MUST NOT be created by this capability.

#### Scenario: Successful registration returns ProjectDto
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains `.specpilot/project.yaml` as a regular file and no conflicting project exists
- **THEN** the system persists a `Project` row and responds with HTTP 201 and a `ProjectDto` whose `repositoryPath` is the canonical realpath and whose `status` is `registered`

#### Scenario: Configuration versioning remains deferred
- **WHEN** a project is registered successfully under this capability
- **THEN** no `ProjectConfigurationVersion` row or configuration snapshot is created

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
All blocked and error responses MUST use the stable body `{ "code": string, "message": string }` where `code` is machine-readable and `message` is operator-facing. Uniqueness conflicts MUST return HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug`. Unexpected filesystem, Prisma, or infrastructure failures MUST return HTTP 500 with a safe generic payload and MUST NOT expose additional internal paths, stack traces, or file contents. `GET /projects` MUST return the list of registered `ProjectDto` values for empty-state support. `GET /projects/:id` MUST return HTTP 200 with `ProjectDto` when found and HTTP 404 with `code` `project_not_found` when missing.

#### Scenario: Duplicate slug conflict
- **WHEN** registration would violate the unique `slug` constraint
- **THEN** the response is HTTP 409 with `code` `duplicate_project_slug` and no partial success row remains from the failed attempt

#### Scenario: Duplicate canonical path conflict
- **WHEN** registration would violate the unique `repositoryPath` constraint
- **THEN** the response is HTTP 409 with `code` `duplicate_repository_path`

#### Scenario: Safe 500 payload
- **WHEN** an unexpected infrastructure failure occurs during registration
- **THEN** the response is HTTP 500 with `{ code, message }` and does not include stack traces, extra internal paths, or file contents

#### Scenario: Get project by id success
- **WHEN** `GET /projects/:id` is requested for an existing project
- **THEN** the response is HTTP 200 with the corresponding `ProjectDto`

#### Scenario: Get project by id not found
- **WHEN** `GET /projects/:id` is requested for a missing id
- **THEN** the response is HTTP 404 with `code` `project_not_found`

#### Scenario: List projects for empty-state support
- **WHEN** `GET /projects` is requested and no projects are registered
- **THEN** the response is an empty array suitable for empty-registry UI state

### Requirement: Database unique constraints are the final concurrency guarantee
PostgreSQL unique constraints on `repositoryPath` and `slug` MUST be the final guarantee against concurrent registrations. Application prechecks MAY improve operator feedback but MUST NOT replace those constraints. Prisma unique-constraint violations MUST map deterministically to HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug` as appropriate. The system MUST NOT rely on check-then-insert alone without handling the uniqueness race.

#### Scenario: Concurrent insert loses uniqueness race
- **WHEN** two concurrent registration attempts target the same canonical path or slug and one insert wins
- **THEN** the losing attempt results in HTTP 409 with the corresponding duplicate `code` after the unique constraint rejects the insert

### Requirement: Minimal Spanish-first registration console outcomes
`apps/web` MUST expose a minimal Spanish-first project registration flow (not a discovery-health dashboard) with explicit empty, loading, success, and blocked/error outcomes driven by the projects API contracts. Blocked or error responses MUST show the operator-facing `message` (and MUST NOT pretend success).

#### Scenario: Empty registry state
- **WHEN** the registration surface loads and `GET /projects` returns an empty list
- **THEN** empty-registry copy is shown with a ready registration form

#### Scenario: Loading state during register
- **WHEN** `POST /projects` is in flight
- **THEN** a loading state is presented and submit is not treated as complete

#### Scenario: Success state after register
- **WHEN** `POST /projects` returns HTTP 201
- **THEN** the registered project summary from the response body is shown

#### Scenario: Blocked state surfaces API message
- **WHEN** `POST /projects` returns HTTP 422 or 409 with `{ code, message }`
- **THEN** the UI shows the blocked/error outcome using the operator-facing message and does not show success
