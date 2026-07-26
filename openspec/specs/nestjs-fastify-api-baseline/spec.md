# nestjs-fastify-api-baseline

## Purpose

NestJS 11 HTTP API baseline using Fastify 5 with an exact public health contract and safe startup failure behavior.

## Requirements

### Requirement: NestJS 11 Fastify API exists
The repository SHALL provide `apps/api` as a NestJS major 11 HTTP API using Fastify major 5 through `@nestjs/platform-fastify`. Nest framework packages under `@nestjs/*` MUST remain on major 11 and mutually compatible.

#### Scenario: NestJS Fastify API app is present
- **WHEN** the API baseline is verified
- **THEN** `apps/api` exists as NestJS 11 with Fastify 5 via `@nestjs/platform-fastify`

### Requirement: Exact public GET /health contract
`apps/api` MUST expose exactly one public baseline health route at `GET /health`. On success the route MUST return the stable JSON contract `{ "status": "ok", "service": "api" }`. The baseline MUST NOT add a database readiness probe.

#### Scenario: Health success response
- **WHEN** the API baseline module is serving correctly and `GET /health` is requested
- **THEN** the response body is exactly `{ "status": "ok", "service": "api" }`

#### Scenario: Database readiness is absent
- **WHEN** the health surface is inspected
- **THEN** no PostgreSQL, Prisma, or other database readiness check is part of the health response or route behavior

### Requirement: API startup failure is safe and explicit
If the API cannot initialize validly, the process MUST exit non-zero or MUST refuse to serve successful health responses. The API MUST NOT silently continue in an invalid state while reporting health success.

#### Scenario: Invalid startup does not report health success
- **WHEN** the API cannot initialize validly
- **THEN** the process exits non-zero or `GET /health` does not return the success contract

#### Scenario: Health success requires a serving baseline
- **WHEN** `GET /health` returns the success contract
- **THEN** the HTTP server is serving the baseline API module correctly
