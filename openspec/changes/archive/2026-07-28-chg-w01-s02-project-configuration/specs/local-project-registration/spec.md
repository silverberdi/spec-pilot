## MODIFIED Requirements

### Requirement: Register eligible local repositories as durable Project records
The system SHALL register a local macOS repository as a durable `Project` when registration eligibility succeeds. Eligibility remains presence-only as defined by this capability's preflight requirements. On eligibility success the system MUST insert the `Project` first, then attempt configuration attach as defined by `project-yaml-configuration`. The `Project` MUST NOT be rolled back or deleted because of later attach failures. On success, `POST /projects` MUST return HTTP 201 with `RegisterProjectResponse`: a `ProjectDto` containing `id`, `slug`, `displayName`, `repositoryPath`, `status`, `registeredAt`, `lastInspectedAt`, and `configurationVersionId`, plus a required `configuration` discriminated outcome. Initial `status` MUST be `registered`. `lastInspectedAt` MUST be null until a later discovery slice sets it. When attach succeeds, `configuration.status` MUST be `attached`, `configuration.version` MUST be present, and `configurationVersionId` MUST equal `version.id`. When attach is blocked (expected validation/filesystem/size/parse failures or unexpected attach infrastructure failure), `configuration.status` MUST be `blocked`, `configuration.error` MUST be present with a machine-readable `code`, and `configurationVersionId` MUST be `null`. Unexpected attach failures MUST use `code` `configuration_attach_failed` with a safe message and MUST NOT insert a partial snapshot.

#### Scenario: Successful registration returns RegisterProjectResponse with attached configuration
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains a schema-valid `.specpilot/project.yaml` within size limits and no conflicting project exists
- **THEN** the system persists a `Project` row, persists a `ProjectConfigurationVersion`, responds with HTTP 201 `RegisterProjectResponse` where `configuration.status` is `attached`, and `configurationVersionId` equals `configuration.version.id`

#### Scenario: Registration succeeds with blocked configuration attach
- **WHEN** eligibility succeeds but configuration attach fails with an expected parse or schema error
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, a specific error `code`, `configurationVersionId` null, the `Project` row retained, and no configuration version row inserted

#### Scenario: Unexpected attach failure keeps the project and returns blocked attach code
- **WHEN** eligibility succeeds and an unexpected infrastructure failure occurs during configuration attach
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, `code` `configuration_attach_failed`, `configurationVersionId` null, no partial snapshot, and the registered `Project` retained

#### Scenario: Successful registration returns ProjectDto fields
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains `.specpilot/project.yaml` as a regular file and no conflicting project exists
- **THEN** the system persists a `Project` row and responds with HTTP 201 including a `ProjectDto` whose `repositoryPath` is the canonical realpath and whose `status` is `registered`

### Requirement: Exact HTTP error and lookup contracts for projects
All blocked and error responses MUST use the stable body `{ "code": string, "message": string }` where `code` is machine-readable and `message` is operator-facing. Uniqueness conflicts MUST return HTTP 409 with `duplicate_repository_path` or `duplicate_project_slug`. Unexpected filesystem, Prisma, or infrastructure failures that occur **before** the `Project` insert MUST return HTTP 500 with a safe generic payload and MUST NOT expose additional internal paths, stack traces, or file contents. Unexpected failures **during post-insert configuration attach** MUST NOT convert the registration into HTTP 500; they MUST follow the `RegisterProjectResponse` blocked attach contract with `configuration_attach_failed`. `GET /projects` MUST return the list of registered `ProjectDto` values (including `configurationVersionId`) for empty-state support. `GET /projects/:id` MUST return HTTP 200 with `ProjectDto` when found and HTTP 404 with `code` `project_not_found` when missing.

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
- **THEN** the response is HTTP 200 with the corresponding `ProjectDto` including `configurationVersionId`

#### Scenario: Get project by id not found
- **WHEN** `GET /projects/:id` is requested for a missing id
- **THEN** the response is HTTP 404 with `code` `project_not_found`

#### Scenario: List projects for empty-state support
- **WHEN** `GET /projects` is requested and no projects are registered
- **THEN** the response is an empty array suitable for empty-registry UI state

### Requirement: Minimal Spanish-first registration console outcomes
`apps/web` MUST expose a minimal Spanish-first project registration flow (not a discovery-health dashboard) with explicit empty, loading, success, and blocked/error outcomes driven by the projects API contracts. On HTTP 201, the UI MUST present the `RegisterProjectResponse.configuration` outcome (attached summary versus blocked reason/`code`) and MUST NOT pretend configuration succeeded when `configuration.status` is `blocked`. Eligibility blocked or error responses (HTTP 422 or 409) MUST show the operator-facing `message` and MUST NOT pretend registration success. The surface MAY include an explicit configuration refresh action for a known project id that surfaces refresh success, 422 blocked, and 500 error outcomes without becoming a project dashboard.

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
