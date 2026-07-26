## MODIFIED Requirements

### Requirement: Exact public GET /health contract
`apps/api` MUST expose a public liveness route at `GET /health`. On success the route MUST return the stable JSON contract `{ "status": "ok", "service": "api" }`. The liveness route MUST NOT perform a PostgreSQL, Prisma, or other database readiness check and MUST NOT depend on database connectivity. Database readiness MUST be exposed only through the separate readiness route defined by this change.

#### Scenario: Health success response
- **WHEN** the API baseline module is serving correctly and `GET /health` is requested
- **THEN** the response body is exactly `{ "status": "ok", "service": "api" }`

#### Scenario: Liveness ignores database connectivity
- **WHEN** `DATABASE_URL` is well-formed but the database is unreachable and `GET /health` is requested
- **THEN** the response body remains exactly `{ "status": "ok", "service": "api" }` and no database readiness check is part of the liveness route behavior

### Requirement: API startup failure is safe and explicit
If `DATABASE_URL` is missing or malformed, or the API otherwise cannot initialize validly due to configuration defects, the process MUST exit non-zero and MUST NOT serve HTTP traffic. The API MUST NOT silently continue in an invalid configuration while reporting liveness success. Unreachable-but-well-formed database connectivity MUST NOT be treated as a configuration startup failure; it MUST be reported through readiness failure while liveness may continue to succeed.

#### Scenario: Missing or malformed DATABASE_URL fails startup
- **WHEN** the API starts with a missing or malformed `DATABASE_URL`
- **THEN** the process exits non-zero and does not serve HTTP traffic

#### Scenario: Health success requires a serving baseline
- **WHEN** `GET /health` returns the success contract
- **THEN** the HTTP server is serving the baseline API module correctly and startup configuration validation has passed

## ADDED Requirements

### Requirement: Exact public GET /health/ready contract
`apps/api` MUST expose a public readiness route at `GET /health/ready`. When a Prisma connectivity probe succeeds, the route MUST return HTTP 200 with the JSON body `{ "status": "ok", "service": "api", "database": "ok" }`. When the probe fails, the route MUST return HTTP 503 with an explicit non-ok database status in the JSON body. The API MUST NOT fabricate readiness success while the database is unreachable.

#### Scenario: Readiness success when database is reachable
- **WHEN** the API can probe PostgreSQL successfully through Prisma and `GET /health/ready` is requested
- **THEN** the response status is HTTP 200 and the body is exactly `{ "status": "ok", "service": "api", "database": "ok" }`

#### Scenario: Readiness failure when database is unreachable
- **WHEN** `DATABASE_URL` is well-formed but the database is unreachable and `GET /health/ready` is requested
- **THEN** the response status is HTTP 503 and the JSON body reports an explicit non-ok database status

### Requirement: Prisma module is part of the API baseline
`apps/api` MUST wire Prisma through a Nest module/service that participates in the application module graph so readiness probing and persistence operations use the same client lifecycle.

#### Scenario: Prisma is available to the API module graph
- **WHEN** the Nest API application module is inspected
- **THEN** the Prisma module/service is registered and available for readiness probing and persistence operations
