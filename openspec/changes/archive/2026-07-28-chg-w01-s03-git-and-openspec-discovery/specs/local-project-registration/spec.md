## MODIFIED Requirements

### Requirement: Register eligible local repositories as durable Project records
The system SHALL register a local macOS repository as a durable `Project` when registration eligibility succeeds. Eligibility remains presence-only as defined by this capability's preflight requirements. On eligibility success the system MUST insert the `Project` first, then attempt configuration attach as defined by `project-yaml-configuration`. The `Project` MUST NOT be rolled back or deleted because of later attach failures. On success, `POST /projects` MUST return HTTP 201 with `RegisterProjectResponse`: a `ProjectDto` containing `id`, `slug`, `displayName`, `repositoryPath`, `status`, `registeredAt`, `lastInspectedAt`, and `configurationVersionId`, plus a required `configuration` discriminated outcome. Initial `status` MUST be `registered`. `lastInspectedAt` MUST be null on registration success; `git-and-openspec-discovery` MAY set `lastInspectedAt` and `lastDiscovery` afterward via explicit discovery refresh. Registration MUST NOT auto-run discovery. When attach succeeds, `configuration.status` MUST be `attached`, `configuration.version` MUST be present, and `configurationVersionId` MUST equal `version.id`. When attach is blocked (expected validation/filesystem/size/parse failures or unexpected attach infrastructure failure), `configuration.status` MUST be `blocked`, `configuration.error` MUST be present with a machine-readable `code`, and `configurationVersionId` MUST be `null`. Unexpected attach failures MUST use `code` `configuration_attach_failed` with a safe message and MUST NOT insert a partial snapshot.

#### Scenario: Successful registration returns RegisterProjectResponse with attached configuration
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains a schema-valid `.specpilot/project.yaml` within size limits and no conflicting project exists
- **THEN** the system persists a `Project` row, persists a `ProjectConfigurationVersion`, responds with HTTP 201 `RegisterProjectResponse` where `configuration.status` is `attached`, and `configurationVersionId` equals `configuration.version.id`

#### Scenario: Registration succeeds with blocked configuration attach
- **WHEN** eligibility succeeds but configuration attach fails with an expected parse or schema error
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, a specific error `code`, `configurationVersionId` null, the `Project` row retained, and no configuration version row inserted

#### Scenario: Unexpected attach failure keeps the project and returns blocked attach code
- **WHEN** eligibility succeeds and an unexpected infrastructure failure occurs during configuration attach
- **THEN** the response is HTTP 201 with `configuration.status` `blocked`, `code` `configuration_attach_failed`, `configurationVersionId` null, no partial snapshot, and the registered `Project` retained

#### Scenario: Successful registration returns ProjectDto fields with null lastInspectedAt
- **WHEN** an operator submits a valid absolute path to an eligible local repository that contains `.specpilot/project.yaml` as a regular file and no conflicting project exists
- **THEN** the system persists a `Project` row and responds with HTTP 201 including a `ProjectDto` whose `repositoryPath` is the canonical realpath, whose `status` is `registered`, and whose `lastInspectedAt` is null

#### Scenario: Registration does not auto-run discovery
- **WHEN** registration succeeds
- **THEN** discovery refresh is not invoked as part of registration and `lastDiscovery` remains unset until an explicit discovery refresh

### Requirement: Minimal Spanish-first registration console outcomes
`apps/web` MUST expose a minimal Spanish-first project registration flow (not a discovery-health dashboard) with explicit empty, loading, success, and blocked/error outcomes driven by the projects API contracts. On HTTP 201, the UI MUST present the `RegisterProjectResponse.configuration` outcome (attached summary versus blocked reason/`code`) and MUST NOT pretend configuration succeeded when `configuration.status` is `blocked`. Eligibility blocked or error responses (HTTP 422 or 409) MUST show the operator-facing `message` and MUST NOT pretend registration success. The surface MAY include an explicit configuration refresh action and an explicit discovery refresh action for a known project id that surfaces success, blocked subsystem, 422, and 500 outcomes without becoming a project dashboard.

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
