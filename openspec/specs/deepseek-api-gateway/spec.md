# deepseek-api-gateway

## Purpose

Provide a project-scoped, fail-closed DeepSeek probe gateway with deterministic model resolution, retries, response validation, and secret-safe operator outcomes.

## Requirements

### Requirement: Probe accepts only DeepseekProbeStage with discovery default
The system SHALL expose `POST /projects/:id/deepseek/probe` with request body `{ stage?: DeepseekProbeStage }` where `DeepseekProbeStage` is exactly `discovery` | `planning` | `applied` | `verify`. When `stage` is omitted the system MUST use exact default `discovery`. The endpoint MUST NOT accept `ReviewStage` value `new`, unknown stages, or extra body fields; such requests MUST return HTTP 422 with `code` `invalid_deepseek_probe_request` and MUST NOT perform any DeepSeek HTTP attempt. The system MUST NOT reuse `ReviewStage` as the probe request type. Model resolution MUST map `discovery` → `review.models.discovery`, `planning` → `review.models.planning`, `applied` → `review.models.applied`, and `verify` → `review.models.verify` from the project's active `ProjectConfigurationVersion` snapshot. Aliases `deepseek-flash` and `deepseek-v4-flash` MUST resolve to API model `deepseek-v4-flash`; `deepseek-pro` and `deepseek-v4-pro` MUST resolve to `deepseek-v4-pro`. Legacy aliases `deepseek-chat` and `deepseek-reasoner` MUST be rejected with `deepseek_model_unresolved`. If `review.provider` is not `deepseek` or the stage alias cannot resolve, the system MUST return `deepseek_model_unresolved` without calling DeepSeek.

#### Scenario: Default stage is discovery
- **WHEN** an operator posts probe with body `{}` or omitted stage for a registered project with valid DeepSeek configuration and key
- **THEN** the system resolves `review.models.discovery` and proceeds with that alias

#### Scenario: Each of the four probe stages resolves its model key
- **WHEN** probe is invoked with `stage` `discovery`, `planning`, `applied`, or `verify`
- **THEN** the system reads the corresponding `review.models.<stage>` alias and resolves it through the binding catalog

#### Scenario: new and unknown stages are rejected
- **WHEN** probe is invoked with `stage` `new`, an unknown stage string, or any extra body field
- **THEN** the response is HTTP 422 with `code` `invalid_deepseek_probe_request` and zero DeepSeek HTTP attempts occur

### Requirement: Production adapter uses fixed DeepSeek base URL and binding outbound constants
The production DeepSeek HTTP adapter MUST call only `https://api.deepseek.com/chat/completions` (constant production base URL). Operator runtime configuration MUST expose only `DEEPSEEK_API_KEY` and MUST NOT expose `DEEPSEEK_BASE_URL` for normal production/Compose use. Automated tests MUST replace the gateway port through dependency injection; local fake-provider tests MUST NOT require a runtime URL override. A test-only injected base URL MAY exist solely for adapter HTTP integration tests and MUST NEVER be sourced from `project.yaml`, public DTOs, Angular, committed env, or normal Compose runtime. Outbound probe bodies MUST set exactly `stream: false`, `temperature: 0`, `max_tokens: 256`, `response_format: { type: 'json_object' }`, `thinking: { type: 'disabled' }`, and gateway-owned fixed messages that include the word `json` and an example matching `deepseek-gateway-probe-v1`. The client MUST NOT accept client-supplied prompts, schemas, API keys, base URLs, temperature, tools, or messages. The probe path MUST NOT read repository files, `ContextBundle` rows, or disclosure preview/approval data.

#### Scenario: Outbound body uses binding constants
- **WHEN** a probe attempt is constructed for a resolved model
- **THEN** the outbound JSON includes `max_tokens` 256, `stream` false, `temperature` 0, `response_format.type` `json_object`, and `thinking.type` `disabled`

#### Scenario: Probe does not read repository or bundle content
- **WHEN** probe executes for a registered project
- **THEN** no repository file, context-bundle entry body, or disclosure excerpt is read or transmitted

### Requirement: Validate provider envelope and local probe schema fail-closed without retry
After an HTTP 2xx provider response the system MUST validate in this exact order and MUST NOT retry on any failure: (1) response body byte length ≤ 65536; (2) body is valid provider envelope JSON; (3) `choices` is an array; (4) `choices.length === 1`; (5) `choices[0]` exists; (6) `finish_reason === 'stop'`; (7) `choices[0].message` exists; (8) `message.content` is a string; (9) `content.trim().length > 0`; (10) `JSON.parse(content)` with no repair; (11) parsed object satisfies exactly schema id `deepseek-gateway-probe-v1` with shape `{ ok: true; probe: 'deepseek-gateway-probe-v1'; message: string }` where `message` is non-empty and at most 200 characters; (12) if `response.model` is present it MUST be compatible with `resolvedModelId`. Empty or missing content MUST map to `deepseek_empty_response`. `finish_reason` other than `stop` (especially `length`) MUST map to `deepseek_truncated_response`. Malformed envelope or invalid content JSON MUST map to `deepseek_response_invalid`. Valid JSON failing the local schema MUST map to `deepseek_schema_invalid`. Incompatible returned model MUST map to `deepseek_model_mismatch`. The system MUST ignore and MUST NEVER return `reasoning_content`, raw provider bodies, or other provider fields beyond the success DTO.

#### Scenario: Successful envelope yields ok probe DTO
- **WHEN** the provider returns HTTP 200 with one choice, `finish_reason` `stop`, non-empty JSON content matching `deepseek-gateway-probe-v1`, and compatible model
- **THEN** the system returns HTTP 200 ok with `schemaId` `deepseek-gateway-probe-v1` and `parsed` matching the local schema

#### Scenario: Empty content is non-retryable
- **WHEN** the provider returns HTTP 200 with missing or empty trimmed `message.content`
- **THEN** the response code is `deepseek_empty_response` and no further HTTP attempt is made for that failure

#### Scenario: Truncation finish_reason is non-retryable
- **WHEN** the provider returns `finish_reason` `length` or any value other than `stop`
- **THEN** the response code is `deepseek_truncated_response` and the failure is not retried

#### Scenario: Schema mismatch is non-retryable
- **WHEN** content JSON parses but does not satisfy `deepseek-gateway-probe-v1`
- **THEN** the response code is `deepseek_schema_invalid` and the failure is not retried

#### Scenario: Model mismatch is non-retryable
- **WHEN** `response.model` is present and incompatible with `resolvedModelId`
- **THEN** the response code is `deepseek_model_mismatch` and the failure is not retried

#### Scenario: Oversized body is rejected
- **WHEN** the provider response body exceeds 65536 bytes
- **THEN** the system fails closed before treating the body as a valid envelope and does not retry the semantic failure

### Requirement: Apply deterministic retries for transient failures only
The gateway MUST use `maxAttempts` exactly 3, delay 500 ms before attempt 2 and 1000 ms before attempt 3, exponential factor 2, jitter none, and per-attempt timeout 30000 ms cancelled via `AbortController`. `latencyMs` on success MUST be total wall-clock time including attempts and delays. On HTTP 429 or 503 the adapter MUST honor a valid `Retry-After` value capped at 2000 ms; otherwise it MUST use the binding delay. Automated tests MUST inject clock/sleeper and MUST NOT wait in real time. The system MUST retry network reset/connection failure/transient DNS, timeouts, HTTP 429, HTTP 500, and HTTP 503. The system MUST NOT retry HTTP 400, 401, 402, 403, 422, any other 4xx, or HTTP success with envelope/empty/truncation/JSON/schema/model mismatch. Final codes MUST be: missing/blank key → `deepseek_not_configured` (zero attempts); 401/403 → `deepseek_auth_failed`; 402 → `deepseek_insufficient_balance`; 429 exhausted → `deepseek_rate_limited`; 500/503 exhausted → `deepseek_provider_unavailable`; network/DNS/reset exhausted → `deepseek_transport_failed`; timeout exhausted → `deepseek_timeout`; 400/422/other non-auth 4xx → `deepseek_request_rejected`; unexpected local exception → `deepseek_gateway_failed`. The system MUST NOT collapse `deepseek_insufficient_balance` or `deepseek_provider_unavailable` into transport failure.

#### Scenario: Missing key makes zero HTTP attempts
- **WHEN** `DEEPSEEK_API_KEY` is missing or blank and probe is invoked
- **THEN** the response code is `deepseek_not_configured` and no DeepSeek HTTP request is sent

#### Scenario: Transient 503 retries with binding delays
- **WHEN** the provider returns HTTP 503 on attempts 1 and 2 then succeeds on attempt 3 and tests use an injected sleeper
- **THEN** exactly three attempts occur with delays 500 ms then 1000 ms (or capped Retry-After ≤ 2000 ms when present) and success `attemptCount` is 3

#### Scenario: Insufficient balance is distinct and non-retryable
- **WHEN** the provider returns HTTP 402
- **THEN** the response code is `deepseek_insufficient_balance`, no retry occurs, and the code is not mapped to `deepseek_transport_failed`

#### Scenario: Provider unavailable after exhausted 500s
- **WHEN** the provider returns HTTP 500 on all three attempts
- **THEN** the final code is `deepseek_provider_unavailable` and not `deepseek_transport_failed`

#### Scenario: Semantic envelope failure is not retried
- **WHEN** the provider returns HTTP 200 with invalid content JSON or schema mismatch
- **THEN** exactly one attempt occurs and the closed semantic code is returned

### Requirement: Return safe success metadata without secrets or raw provider payloads
A successful probe response MUST include `status` `ok`, `projectId`, `stage` as `DeepseekProbeStage`, `providerId` `deepseek`, `modelAlias`, `resolvedModelId`, `schemaId` `deepseek-gateway-probe-v1`, `attemptCount` integer in 1..3, `providerHttpStatus` exactly 200, optional `providerRequestId` only when copied from a documented safe request-id header, total `latencyMs`, optional usage token fields, and `parsed` matching the local schema. The response MUST NOT include API keys, Authorization headers, raw provider bodies, `reasoning_content`, full header maps, stack traces, repository paths, or secret values. Blocked/error responses MUST use `ProjectErrorResponse` with closed gateway codes and MUST NOT return raw upstream error bodies. Server logs MAY include `projectId`, probe stage, configured alias, resolved model, `attemptCount`, total latency, HTTP status class, and safe error code, and MUST exclude prompts, request/response bodies, API keys, Authorization, `reasoning_content`, and parsed `message`.

#### Scenario: Success includes attemptCount and total latency
- **WHEN** probe succeeds after one or more attempts
- **THEN** the ok DTO includes `attemptCount` between 1 and 3, `providerHttpStatus` 200, and `latencyMs` reflecting total wall-clock time including delays

#### Scenario: API key never appears in success or error bodies
- **WHEN** probe succeeds or fails for any closed code
- **THEN** neither the HTTP body nor captured evidence includes the API key value

### Requirement: Keep general health healthy when the gateway key is absent
`GET /health` MUST remain successful when `DEEPSEEK_API_KEY` is absent. Gateway-specific readiness or probe state MUST report not-configured when the key is absent rather than failing general application liveness. The gateway MUST NOT claim budget reservation, persist budget ledgers, or introduce Prisma models for budgets, findings, prompts, authentication, or users. Probe outcomes MUST remain ephemeral and MUST NOT insert review-run or transmission rows. Review-run orchestration (capability `review-run-orchestration`) MAY invoke the same gateway port using profile `review_run_orchestration` and MAY persist review-run and transmission aggregates owned by that capability.

#### Scenario: Health succeeds without DeepSeek key
- **WHEN** the API is serving with a valid database configuration and without `DEEPSEEK_API_KEY`
- **THEN** `GET /health` still returns the baseline ok contract

#### Scenario: Probe still inserts no review or transmission rows
- **WHEN** probe succeeds or fails
- **THEN** no review-run or `ContextDisclosureTransmission` row is inserted for the gateway probe

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
