## ADDED Requirements

### Requirement: Persist immutable ProjectConfigurationVersion snapshots with exact-byte sourceHash
The system SHALL persist only successfully validated configurations as immutable `ProjectConfigurationVersion` rows. Each row MUST store `id`, `projectId`, `schemaVersion`, `sourceHash`, `normalizedConfig`, `validatedAt`, and `createdAt`. `sourceHash` MUST be the SHA-256 digest of the exact bytes read from `.specpilot/project.yaml`, encoded as hexadecimal lowercase. The system MUST NOT normalize line endings, whitespace, key order, or YAML content before hashing. `normalizedConfig` MUST represent the separately validated semantic portable contract and MUST NOT be used to compute `sourceHash`. Raw YAML MUST NOT be stored in PostgreSQL. Existing `ProjectConfigurationVersion` rows MUST NOT be updated after insert. A unique constraint on `(projectId, sourceHash)` MUST enforce per-project idempotency. Byte-identical content for the same `projectId` MUST return the existing version without inserting a duplicate. A byte difference MUST create a new version even when `normalizedConfig` would be identical.

#### Scenario: Successful validation creates an immutable version
- **WHEN** a registered project's `.specpilot/project.yaml` is read, is within size limits, parses, and schema-validates
- **THEN** a `ProjectConfigurationVersion` row is inserted with lowercase hex SHA-256 `sourceHash` of the exact source bytes and a `normalizedConfig` JSON snapshot, and raw YAML is not stored

#### Scenario: Same bytes are idempotent for a project
- **WHEN** configuration refresh or attach runs again against the same `projectId` with byte-identical `.specpilot/project.yaml` content
- **THEN** no duplicate version row is inserted and the existing version for that `(projectId, sourceHash)` is returned as success

#### Scenario: Byte difference creates a new version
- **WHEN** two source files differ only by line endings (or any other bytes) for the same project and both validate
- **THEN** their `sourceHash` values differ and a new `ProjectConfigurationVersion` row is created for the newer bytes

#### Scenario: Version rows are immutable
- **WHEN** a later refresh produces a different valid `sourceHash`
- **THEN** prior version rows remain unchanged and only a new row is inserted

### Requirement: Active configuration pointer updates transactionally
Inserting a new valid `ProjectConfigurationVersion` and updating `Project.configurationVersionId` to that version's `id` MUST occur in a single PostgreSQL transaction. If either operation fails, neither MUST remain applied. On validation failure, the system MUST NOT insert a version row and MUST NOT change `configurationVersionId` (any prior valid active snapshot remains active). Concurrent same-hash refresh MUST resolve via the unique `(projectId, sourceHash)` constraint and return the existing version as idempotent success.

#### Scenario: Insert and pointer move are atomic
- **WHEN** a new valid configuration version is persisted
- **THEN** the version row and the project's `configurationVersionId` update commit together, or neither is applied

#### Scenario: Validation failure leaves prior active pointer unchanged
- **WHEN** a project already has an active configuration version and a refresh fails schema validation
- **THEN** no new version row is inserted and `configurationVersionId` remains the prior valid version id

#### Scenario: Concurrent same-hash refresh is idempotent
- **WHEN** two concurrent refresh attempts target the same project with identical source bytes
- **THEN** uniqueness on `(projectId, sourceHash)` prevents duplicate rows and both outcomes resolve to the existing version as success

### Requirement: Fail-closed parse and schema validation of project.yaml
Configuration handling MUST read `.specpilot/project.yaml` as exact bytes from the project's canonical repository directory using read-only filesystem operations. Before parsing, the system MUST reject files larger than exactly **262144** bytes with `code` `project_yaml_too_large` and MUST NOT parse, persist a snapshot, or move `configurationVersionId`. Parse failures MUST use `project_yaml_parse_error`. Schema validation for `schemaVersion: 1` MUST enforce the portable contract shape including required top-level keys, lowercase kebab-case machine IDs, portable repository fields without absolute installation paths, normalized include/exclude patterns in `normalizedConfig`, mandatory secret excludes merged into `normalizedConfig` (`**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/secrets/**`), `executor.tool` equal to `cursor`, read-only validation-assistant mode when enabled, and non-negative finite `review.monthlyBudgetUsd` when present. The system MUST NOT create, modify, or delete files in the target repository.

#### Scenario: Oversized YAML is rejected before parse
- **WHEN** `.specpilot/project.yaml` exceeds 262144 bytes
- **THEN** the outcome uses `code` `project_yaml_too_large`, YAML is not parsed, no version row is inserted, and `configurationVersionId` is not moved

#### Scenario: Parse error is fail-closed
- **WHEN** the YAML bytes cannot be parsed
- **THEN** the outcome uses `code` `project_yaml_parse_error`, no version row is inserted, and `configurationVersionId` is not moved

#### Scenario: Unsupported schemaVersion is blocked
- **WHEN** parsed YAML has a `schemaVersion` other than integer `1`
- **THEN** the outcome uses `code` `unsupported_schema_version` and no active pointer move occurs

#### Scenario: Invalid machine id is blocked
- **WHEN** `project.id` is not lowercase kebab-case
- **THEN** the outcome uses `code` `invalid_machine_id` and no version row is inserted

#### Scenario: Mandatory secret excludes are merged into normalizedConfig
- **WHEN** a valid YAML omits one or more mandatory secret exclude patterns
- **THEN** validation succeeds and `normalizedConfig.context.exclude` includes the mandatory secret patterns

#### Scenario: Non-cursor executor is blocked
- **WHEN** `executor.tool` is not `cursor`
- **THEN** the outcome uses `code` `invalid_executor` and no version row is inserted

#### Scenario: Target repository remains unmodified
- **WHEN** configuration attach or refresh runs against a local repository
- **THEN** no file in that repository is created, modified, or deleted by SpecPilot

### Requirement: Explicit configuration refresh and get endpoints
The system MUST expose `POST /projects/:id/configuration/refresh` and `GET /projects/:id/configuration`. Successful refresh MUST return HTTP 200 with `ProjectConfigurationVersionDto` for a new or same-hash idempotent active version. Expected filesystem, size, parse, or schema failures on refresh MUST return HTTP 422 with the matching machine-readable `code` and MUST NOT move `configurationVersionId`. Unexpected Prisma, filesystem, or infrastructure failures during refresh MUST return HTTP 500 with `code` `configuration_refresh_failed` and a safe message that MUST NOT expose stack traces, YAML contents, or additional internal paths. `GET /projects/:id/configuration` MUST return HTTP 200 with the active `ProjectConfigurationVersionDto` when present, HTTP 404 with `code` `project_not_found` when the project is missing, and HTTP 404 with `code` `configuration_not_found` when the project exists but has no active configuration.

#### Scenario: Refresh success returns active version
- **WHEN** `POST /projects/:id/configuration/refresh` runs for an existing project with valid `.specpilot/project.yaml`
- **THEN** the response is HTTP 200 with `ProjectConfigurationVersionDto` and the project's active `configurationVersionId` references that version

#### Scenario: Refresh expected failure returns 422
- **WHEN** refresh encounters an expected blocked condition such as `project_yaml_too_large` or `project_yaml_parse_error`
- **THEN** the response is HTTP 422 with the specific `code`, no invalid version row is inserted, and `configurationVersionId` is unchanged

#### Scenario: Refresh unexpected failure returns 500
- **WHEN** an unexpected infrastructure failure occurs during refresh
- **THEN** the response is HTTP 500 with `code` `configuration_refresh_failed` and a safe `{ code, message }` body without stacks, YAML contents, or extra internal paths

#### Scenario: Get active configuration success
- **WHEN** `GET /projects/:id/configuration` is requested for a project with an active configuration version
- **THEN** the response is HTTP 200 with that `ProjectConfigurationVersionDto`

#### Scenario: Get configuration distinguishes missing project vs missing configuration
- **WHEN** `GET /projects/:id/configuration` is requested for a missing project id, or for an existing project with null `configurationVersionId`
- **THEN** the response is HTTP 404 with `code` `project_not_found` or `configuration_not_found` respectively
