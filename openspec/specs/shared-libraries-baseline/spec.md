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
This slice MUST NOT introduce product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI.

#### Scenario: No domain or shared UI packages in baseline
- **WHEN** `packages/` is inspected for baseline scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered by this slice beyond `packages/shared-contracts`
