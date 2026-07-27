# shared-libraries-baseline

## Purpose

Shared TypeScript library baseline for contracts reusable by web and API without framework coupling.

## Requirements

### Requirement: packages/shared-contracts is the binding shared package
The repository SHALL provide `packages/shared-contracts` as the initial shared TypeScript package for the application baseline. The package MUST be free of Angular and NestJS framework imports so it remains independently usable by web and API.

#### Scenario: Shared contracts package exists independently
- **WHEN** shared libraries are inspected
- **THEN** `packages/shared-contracts` exists and does not import Angular or NestJS

### Requirement: Health contract and minimal runtime validation are exported
`packages/shared-contracts` MUST export the health response TypeScript contract corresponding to `{ "status": "ok", "service": "api" }` and a minimal repository-owned runtime validator or type guard for that contract. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid health payload is accepted
- **WHEN** the shared runtime validator receives `{ "status": "ok", "service": "api" }`
- **THEN** validation succeeds

#### Scenario: Invalid health payload is rejected
- **WHEN** the shared runtime validator receives a payload missing required fields or with invalid values
- **THEN** validation fails and MUST NOT treat the payload as a valid health success contract

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration request/response and error contracts required by `local-project-registration` without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Registration contracts may live in shared-contracts
- **WHEN** shared contracts for project registration are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

### Requirement: Project registration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for `RegisterProjectRequest`, `ProjectDto`, and `ProjectErrorResponse` (`{ code: string; message: string }`) corresponding to the `local-project-registration` HTTP surface, plus minimal repository-owned runtime validators or type guards for those contracts. The `displayName` maximum of 120 characters MUST be enforced consistently by the shared contract/validator surface. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid ProjectDto is accepted
- **WHEN** the shared runtime validator receives a well-formed `ProjectDto`
- **THEN** validation succeeds

#### Scenario: Invalid error payload is rejected
- **WHEN** the shared runtime validator receives a `ProjectErrorResponse` missing `code` or `message`
- **THEN** validation fails and MUST NOT treat the payload as a valid error contract

#### Scenario: Overlong displayName is rejected by shared validation
- **WHEN** a register request validator receives a trimmed `displayName` longer than 120 characters
- **THEN** validation fails for `invalid_display_name` (or equivalent rejection) and MUST NOT treat the request as valid
