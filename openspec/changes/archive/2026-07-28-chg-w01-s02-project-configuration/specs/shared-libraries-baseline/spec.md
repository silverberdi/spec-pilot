## MODIFIED Requirements

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration and project-configuration request/response and error contracts required by `local-project-registration` and `project-yaml-configuration` without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Registration and configuration contracts may live in shared-contracts
- **WHEN** shared contracts for project registration and configuration are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

### Requirement: Project registration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for `RegisterProjectRequest`, `ProjectDto` (including `configurationVersionId: string | null`), `ProjectErrorResponse` (`{ code: string; message: string }`), `ProjectConfigurationVersionDto`, and binding `RegisterProjectResponse` corresponding to the registration HTTP surface, plus minimal repository-owned runtime validators or type guards for those contracts. `RegisterProjectResponse` MUST be `ProjectDto & { configuration: { status: 'attached'; version: ProjectConfigurationVersionDto } | { status: 'blocked'; error: ProjectErrorResponse } }`. Type guards MUST reject incomplete or ambiguous `configuration` unions (attached without `version`, blocked without `error`, or mixed fields). When validating an `attached` response, guards MUST require `configurationVersionId` to equal `version.id`. When validating a `blocked` response, guards MUST require `configurationVersionId` to be `null`. The `displayName` maximum of 120 characters MUST remain enforced by the shared contract/validator surface. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid ProjectDto is accepted
- **WHEN** the shared runtime validator receives a well-formed `ProjectDto`
- **THEN** validation succeeds

#### Scenario: Valid attached RegisterProjectResponse is accepted
- **WHEN** the shared runtime validator receives a well-formed `RegisterProjectResponse` with `configuration.status` `attached`, a `version`, and matching `configurationVersionId`
- **THEN** validation succeeds

#### Scenario: Valid blocked RegisterProjectResponse is accepted
- **WHEN** the shared runtime validator receives a well-formed `RegisterProjectResponse` with `configuration.status` `blocked`, an `error`, and `configurationVersionId` null
- **THEN** validation succeeds

#### Scenario: Ambiguous configuration union is rejected
- **WHEN** the shared runtime validator receives a register response with `configuration.status` `attached` but missing `version`, or `blocked` but missing `error`, or both `version` and `error`
- **THEN** validation fails and MUST NOT treat the payload as a valid `RegisterProjectResponse`

#### Scenario: Invalid error payload is rejected
- **WHEN** the shared runtime validator receives a `ProjectErrorResponse` missing `code` or `message`
- **THEN** validation fails and MUST NOT treat the payload as a valid error contract

#### Scenario: Overlong displayName is rejected by shared validation
- **WHEN** a register request validator receives a trimmed `displayName` longer than 120 characters
- **THEN** validation fails for `invalid_display_name` (or equivalent rejection) and MUST NOT treat the request as valid
