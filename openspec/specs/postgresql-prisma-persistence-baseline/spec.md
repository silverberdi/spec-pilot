# postgresql-prisma-persistence-baseline

## Purpose

PostgreSQL persistence baseline for SpecPilot using Prisma under `apps/api`, with a non-domain operational metadata probe model, deterministic migrations, and a bounded Project registration domain model introduced by `w01-s01`.

## Requirements

### Requirement: Prisma schema and migrations live under apps/api
The repository SHALL provide a Prisma schema at `apps/api/prisma/schema.prisma` and committed migrations under `apps/api/prisma/migrations/`. The Prisma CLI and Prisma client packages MUST resolve to exactly the same concrete version, be compatible with Node.js 24.18.0 and TypeScript 6.0.3, and be locked in the single root `package-lock.json`. The datasource MUST target PostgreSQL only. SQLite and other non-PostgreSQL stores MUST NOT be introduced.

#### Scenario: Schema and migrations are present
- **WHEN** the persistence baseline is verified
- **THEN** `apps/api/prisma/schema.prisma` exists, at least one committed migration exists under `apps/api/prisma/migrations/`, and the datasource is PostgreSQL

#### Scenario: Prisma CLI and client versions match
- **WHEN** package manifests and the root lockfile are inspected
- **THEN** the Prisma CLI and Prisma client resolve to the same concrete version without peer-dependency bypasses

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. This change MAY add a bounded `Project` registration domain model (and only the registration fields required by `local-project-registration`) with unique constraints on canonical `repositoryPath` and `slug`. The schema MUST NOT introduce product domain models or tables for configuration versions, reviews, findings, budgets, prompts, usage, authentication, or users. `ProjectConfigurationVersion` remains out of scope for this change.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: Project registration model is permitted
- **WHEN** the Prisma schema is inspected for product domain tables introduced by this change
- **THEN** a bounded `Project` registration model may be present with unique `repositoryPath` and `slug`, and no configuration-version, review, finding, budget, prompt, usage, authentication, or user models are introduced

#### Scenario: Other product aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates
- **THEN** no `ProjectConfigurationVersion`, review, finding, budget, prompt, usage, authentication, or user tables are present

### Requirement: Prisma client is wired through Nest lifecycle in apps/api
`apps/api` MUST provide a Nest module and service that owns the Prisma client connect and disconnect lifecycle. The generated Prisma client MUST be consumed only by `apps/api` in this slice. The API MUST be able to perform a successful insert-and-read round trip against the baseline operational metadata model when a migrated PostgreSQL database is available.

#### Scenario: Nest Prisma lifecycle owns the client
- **WHEN** the API module graph is inspected
- **THEN** a dedicated Nest Prisma module/service manages Prisma client connect and disconnect

#### Scenario: Metadata round trip succeeds against a migrated database
- **WHEN** committed migrations have been applied to an available PostgreSQL database and the API Prisma client inserts then reads a baseline metadata record
- **THEN** the round trip succeeds through the typed Prisma client

### Requirement: Connection configuration uses DATABASE_URL without committed secrets
Database connectivity MUST be configured through the `DATABASE_URL` environment variable. The repository MUST provide a committed example env file with placeholders only. Real environment files containing local credentials MUST be gitignored. Committed configuration MUST NOT contain production secrets or non-placeholder credential values intended as secrets.

#### Scenario: Example env documents DATABASE_URL placeholders
- **WHEN** the committed example env file is inspected
- **THEN** `DATABASE_URL` is documented with placeholders and no real secret values are committed

#### Scenario: Real env files are ignored
- **WHEN** git ignore rules are inspected for local env files
- **THEN** real `.env` files used for local credentials are gitignored

### Requirement: Migration apply path is deterministic
Authoring MAY use `prisma migrate dev`. Applying committed migrations for Compose, evidence, and shared local state MUST use `prisma migrate deploy`. Applied migration files committed to the repository MUST be treated as immutable history; corrections MUST be delivered as new migrations. Documented operator runbooks for shared local state MUST NOT prescribe `prisma db push` or `prisma migrate reset` as the normal apply path.

#### Scenario: Committed migrations apply with migrate deploy
- **WHEN** committed migrations are applied to an empty or compatible PostgreSQL database for evidence or Compose startup
- **THEN** `prisma migrate deploy` succeeds and brings the schema to the committed baseline

#### Scenario: Operator runbooks exclude destructive reset as normal path
- **WHEN** operator-facing persistence runbooks are inspected
- **THEN** the documented normal apply path is `prisma migrate deploy` and does not prescribe `prisma db push` or `prisma migrate reset` for shared local state
