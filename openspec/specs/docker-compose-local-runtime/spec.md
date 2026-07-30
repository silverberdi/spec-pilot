# docker-compose-local-runtime

## Purpose

SpecPilot-only Docker Compose local runtime for PostgreSQL, API, and web with pinned images, healthchecks, secret-safe configuration, and operator runbooks that never target foreign Docker resources.

## Requirements

### Requirement: Root Compose file defines postgres, api, and web
The repository SHALL provide a single root `compose.yaml` that defines `postgres`, `api`, and `web` services for the local SpecPilot runtime. The Compose file MUST NOT define an `apps/worker` service in this slice. The Compose file MUST NOT be used as CI ownership for `w00-s04`.

#### Scenario: Foundation services are defined
- **WHEN** `compose.yaml` is inspected
- **THEN** it defines `postgres`, `api`, and `web` services and does not define a worker service

### Requirement: Postgres service uses a pinned official image with healthcheck
The `postgres` service MUST use a pinned official PostgreSQL image tag or digest (not `latest`), a named volume for data durability, a `pg_isready` healthcheck, host port mapping for native tooling, and documented non-secret local-development credentials supplied through environment configuration.

#### Scenario: Postgres image is pinned and healthy
- **WHEN** the Compose Postgres service is inspected
- **THEN** the image is an official PostgreSQL image with an explicit pin (no `latest` tag), a named volume is configured, and a `pg_isready` healthcheck is present

#### Scenario: Host port enables native tooling
- **WHEN** an operator runs only the Postgres service via Compose
- **THEN** PostgreSQL is reachable on the mapped host port for native macOS API/web development

### Requirement: API service depends on healthy Postgres and applies migrations before serve
The Compose `api` service MUST build from the repository using a Node.js 24-compatible base, receive a `DATABASE_URL` that targets the Compose `postgres` service, depend on Postgres becoming healthy, and run `prisma migrate deploy` before serving HTTP traffic.

#### Scenario: API waits for Postgres and migrates before serve
- **WHEN** Compose starts the `api` service against a healthy `postgres` service
- **THEN** the API applies committed migrations with `prisma migrate deploy` before serving, using a `DATABASE_URL` that points at the Compose Postgres service

### Requirement: Web service is reachable from the host
The Compose `web` service MUST build from the repository, serve the Angular production build, and be reachable from the host for operator validation of the baseline console.

#### Scenario: Web service responds from the host
- **WHEN** Compose has started the `web` service successfully
- **THEN** the baseline web console is reachable from the host over the documented published port or URL

### Requirement: Operator runbooks cover Compose and native-dev variants
The repository MUST document copyable operator commands for Compose up/down, the local volume reset procedure (explicitly marked destructive and local-only), and the native macOS development variant that runs Compose Postgres while serving `api` and `web` natively. OpenSpec operator commands referenced in those docs MUST use the generated hyphenated syntax such as `/opsx-apply` and `/opsx-verify`.

#### Scenario: Compose and native-dev commands are documented
- **WHEN** an operator follows the local-runtime runbook
- **THEN** copyable commands exist for Compose up/down, local volume reset, and the native-dev Postgres-only Compose variant

#### Scenario: OpenSpec command syntax is hyphenated
- **WHEN** OpenSpec commands appear in the operator-facing runbook for this slice
- **THEN** they use generated hyphenated forms such as `/opsx-apply` rather than colon forms

### Requirement: Env examples stay secret-safe
Compose and env documentation MUST use placeholders or documented non-secret local-development defaults only. Real credential-bearing env files MUST remain gitignored. The local runtime MUST NOT require committing secrets to satisfy Compose startup. When DeepSeek gateway support is documented, tracked examples MUST include only the `DEEPSEEK_API_KEY` variable name with an empty placeholder and MUST NOT document a normal-runtime `DEEPSEEK_BASE_URL` override.

#### Scenario: No secrets required in tracked Compose/env files
- **WHEN** tracked Compose and example env files are inspected
- **THEN** they contain only placeholders or documented non-secret local-development defaults and do not require committed secrets to start

#### Scenario: DeepSeek key placeholder is empty and base URL is not operator-configured
- **WHEN** tracked env examples mention DeepSeek gateway configuration
- **THEN** `DEEPSEEK_API_KEY` appears only as an empty placeholder and `DEEPSEEK_BASE_URL` is not exposed as normal operator configuration

### Requirement: Compose forwards only DEEPSEEK_API_KEY for the DeepSeek gateway
The local Compose API service MAY receive `DEEPSEEK_API_KEY` from gitignored local environment configuration. Normal production/runtime Compose configuration MUST NOT introduce operator-configurable `DEEPSEEK_BASE_URL`. Tracked `.env.example` (or equivalent) MUST list `DEEPSEEK_API_KEY` as an empty placeholder only and MUST NOT commit real keys. Foreign Docker resources including `axioma-db-dev` MUST remain untouched by SpecPilot Compose gateway wiring.

#### Scenario: Only the API key is operator-configurable for the gateway
- **WHEN** Compose and env example files for this change are inspected
- **THEN** `DEEPSEEK_API_KEY` may be forwarded from gitignored local env with an empty tracked placeholder, and `DEEPSEEK_BASE_URL` is not part of normal operator Compose configuration

#### Scenario: Foreign containers remain untouched
- **WHEN** SpecPilot Compose services are started or rebuilt for gateway key wiring
- **THEN** no foreign container such as `axioma-db-dev` is created, reset, or modified as part of that wiring

### Requirement: Compose continues to forward DEEPSEEK_API_KEY for review-run orchestration
Local Compose MUST continue to forward SpecPilot-owned `DEEPSEEK_API_KEY` into the API service for DeepSeek gateway use by both probe and review-run orchestration. Compose MUST NOT commit secrets, MUST NOT introduce operator `DEEPSEEK_BASE_URL`, and MUST NOT touch foreign Docker resources.

#### Scenario: API service still receives DEEPSEEK_API_KEY from env
- **WHEN** Compose API service environment is inspected
- **THEN** `DEEPSEEK_API_KEY` may be forwarded from gitignored local env and no secret value is committed
