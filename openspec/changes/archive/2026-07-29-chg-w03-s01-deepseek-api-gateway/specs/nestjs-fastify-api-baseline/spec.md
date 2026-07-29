## ADDED Requirements

### Requirement: NestJS DeepSeek gateway module is fakeable inside apps/api
`apps/api` MUST provide a Nest-owned DeepSeek gateway module exposing a `DeepseekGatewayPort` (or equivalent) that the production HTTP adapter and test fakes both implement. This slice MUST NOT require a separate `apps/worker` deployable to perform probe calls. Later slices MUST consume the same port and MUST NOT bypass it with ad-hoc HTTP. Production adapter MUST use the constant official base URL `https://api.deepseek.com`. Automated tests MUST replace the port through dependency injection without a runtime `DEEPSEEK_BASE_URL`.

#### Scenario: Gateway module is registered in the API graph
- **WHEN** the Nest API application module is inspected for this change
- **THEN** a DeepSeek gateway module/service implementing the fakeable port is registered and available to project-scoped probe handling

#### Scenario: Tests replace the port without runtime URL override
- **WHEN** automated gateway tests run
- **THEN** they inject a fake port or test double and do not require operator `DEEPSEEK_BASE_URL` configuration

## MODIFIED Requirements

### Requirement: Exact public GET /health contract
`apps/api` MUST expose a public liveness route at `GET /health`. On success the route MUST return the stable JSON contract `{ "status": "ok", "service": "api" }`. The liveness route MUST NOT perform a PostgreSQL, Prisma, or other database readiness check and MUST NOT depend on database connectivity. Database readiness MUST be exposed only through the separate readiness route defined by this change. Absence of optional `DEEPSEEK_API_KEY` MUST NOT cause liveness failure.

#### Scenario: Health success response
- **WHEN** the API baseline module is serving correctly and `GET /health` is requested
- **THEN** the response body is exactly `{ "status": "ok", "service": "api" }`

#### Scenario: Liveness ignores database connectivity
- **WHEN** `DATABASE_URL` is well-formed but the database is unreachable and `GET /health` is requested
- **THEN** the response body remains exactly `{ "status": "ok", "service": "api" }` and no database readiness check is part of the liveness route behavior

#### Scenario: Liveness ignores missing DeepSeek API key
- **WHEN** `DEEPSEEK_API_KEY` is absent and `GET /health` is requested while the API is otherwise serving
- **THEN** the response body remains exactly `{ "status": "ok", "service": "api" }`
