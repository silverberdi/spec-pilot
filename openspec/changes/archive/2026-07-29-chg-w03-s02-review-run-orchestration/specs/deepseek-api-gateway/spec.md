## MODIFIED Requirements

### Requirement: Keep general health healthy when the gateway key is absent
`GET /health` MUST remain successful when `DEEPSEEK_API_KEY` is absent. Gateway-specific readiness or probe state MUST report not-configured when the key is absent rather than failing general application liveness. The gateway MUST NOT claim budget reservation, persist budget ledgers, or introduce Prisma models for budgets, findings, prompts, authentication, or users. Probe outcomes MUST remain ephemeral and MUST NOT insert review-run or transmission rows. Review-run orchestration (capability `review-run-orchestration`) MAY invoke the same gateway port using profile `review_run_orchestration` and MAY persist review-run and transmission aggregates owned by that capability.

#### Scenario: Health succeeds without DeepSeek key
- **WHEN** the API is serving with a valid database configuration and without `DEEPSEEK_API_KEY`
- **THEN** `GET /health` still returns the baseline ok contract

#### Scenario: Probe still inserts no review or transmission rows
- **WHEN** probe succeeds or fails
- **THEN** no review-run or `ContextDisclosureTransmission` row is inserted for the gateway probe

## ADDED Requirements

### Requirement: Expose discriminated DeepseekStructuredExecutionResult for all profiles
`DeepseekGatewayPort` MUST return a closed internal `DeepseekStructuredExecutionResult` for both `probe` and `review_run_orchestration` profiles with `status` `ok` | `failed`, boolean `invocationBegan`, `attemptCount`, `latencyMs`, and safe optional model/HTTP/usage/request-id fields. `invocationBegan` MUST be false only when failure occurs before the first outbound HTTP attempt, with `attemptCount` 0. `invocationBegan` MUST be true once the first outbound attempt starts, with `attemptCount` ≥ 1. Results MUST NOT include API keys, Authorization, prompts, context excerpts, raw request/response bodies, `reasoning_content`, header maps, stacks, or provider message bodies. Public probe HTTP DTOs and probe behavior MUST remain unchanged via service-side mapping of this internal result. Profile `review_run_orchestration` MUST accept only trusted server-built fields (`stage`, optional `changeId`, `promptTemplateId` `review-run-orchestration-v1`, `schemaId` `review-run-orchestration-v1`, bounded context items) with `max_tokens` 1024 and MUST NOT accept client-supplied prompts, messages, tools, temperature, keys, base URL, schema, or content.

#### Scenario: Missing key reports invocationBegan false
- **WHEN** `DEEPSEEK_API_KEY` is missing and a structured completion is requested
- **THEN** the internal result has `status` `failed`, `invocationBegan` false, and `attemptCount` 0

#### Scenario: Transport failure after outbound start reports invocationBegan true
- **WHEN** the first outbound attempt starts and then fails with a transport error
- **THEN** the internal result has `status` `failed`, `invocationBegan` true, and `attemptCount` ≥ 1

#### Scenario: Probe public contract remains unchanged
- **WHEN** `POST /projects/:id/deepseek/probe` succeeds or fails
- **THEN** the public response or error contract matches the archived probe DTO/error codes without exposing the internal result type to clients
