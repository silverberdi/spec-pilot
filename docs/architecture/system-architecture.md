# System Architecture

## Style

Local-first modular monolith with explicit bounded modules and asynchronous job execution inside one deployable system. Avoid microservices until operational evidence justifies them.

## Applications

- `apps/web`: Angular 22 standalone application, PrimeNG, Spanish-first i18n-ready UI.
- `apps/api`: NestJS/Fastify HTTP API and Server-Sent Events endpoint.
- `apps/worker`: background analysis worker; may initially share deployment/runtime with API but remains an explicit application boundary.

## Core modules

- Project Registry
- Project Configuration
- Repository Inspection
- OpenSpec Discovery
- Context Assembly
- Secret Protection
- Review Orchestration
- DeepSeek Gateway
- Budget and Usage
- Findings and Prompts
- Run History and Audit
- Identity (deferred until Google auth wave)

## Persistence

PostgreSQL is canonical for operational state. Repository files remain canonical for project source context. SpecPilot stores hashes, selected excerpts/bundles when policy allows, model responses, findings, prompts, costs, and configuration snapshots.

## Boundary rule

No module may execute arbitrary shell commands from user input. Initial repository access is read-only through allowlisted filesystem and Git inspection operations.
