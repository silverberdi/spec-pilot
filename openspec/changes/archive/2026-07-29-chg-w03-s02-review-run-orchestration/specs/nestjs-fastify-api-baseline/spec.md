## ADDED Requirements

### Requirement: NestJS review-run orchestration module is fakeable inside apps/api
`apps/api` MUST provide a Nest-owned review-run orchestration module that consumes the exported `DeepseekGatewayPort` for profile `review_run_orchestration`, persists `ReviewRun`, `ReviewRunTransition`, and `ContextDisclosureTransmission` through Prisma, and exposes project-scoped create/get/list handling. This slice MUST NOT require a separate `apps/worker` deployable. Automated tests MUST replace the gateway port through dependency injection and MUST NOT bypass the port with ad-hoc HTTP.

#### Scenario: Review-runs module is registered in the API graph
- **WHEN** the Nest API application module is inspected for this change
- **THEN** a review-run orchestration module/service is registered and available to project-scoped review-run routes

#### Scenario: Tests fake the gateway without a second HTTP client
- **WHEN** automated review-run tests execute a create path
- **THEN** they inject a fake `DeepseekGatewayPort` and do not open an alternate DeepSeek HTTP client
