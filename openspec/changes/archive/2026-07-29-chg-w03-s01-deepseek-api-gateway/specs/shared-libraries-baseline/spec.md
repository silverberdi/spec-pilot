## MODIFIED Requirements

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration, project-configuration, discovery, project-dashboard health/list, context-source-resolution, secret-detection-and-exclusion, context-bundle-manifest, context-preview-and-approval, and deepseek-api-gateway request/response and error contracts required by those capabilities without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Registration configuration discovery dashboard resolve secret-scan context-bundle disclosure and DeepSeek contracts may live in shared-contracts
- **WHEN** shared contracts for project registration, configuration, discovery, dashboard health, context-source resolution, secret detection, context-bundle manifests, disclosure preview/approval, and DeepSeek gateway probe are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

## ADDED Requirements

### Requirement: DeepSeek gateway probe contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for closed `DeepseekProbeStage` exactly `discovery` | `planning` | `applied` | `verify` (distinct from `ReviewStage`, which continues to include `new`), probe request `{ stage?: DeepseekProbeStage }`, probe ok DTO including `status` `ok`, `projectId`, `stage`, `providerId` `deepseek`, `modelAlias`, `resolvedModelId`, `schemaId` `deepseek-gateway-probe-v1`, `attemptCount` (1..3), `providerHttpStatus` 200, optional `providerRequestId`, total `latencyMs`, optional usage fields, and `parsed` exactly `{ ok: true; probe: 'deepseek-gateway-probe-v1'; message: string }`, plus closed DeepSeek error codes on `ProjectErrorResponse.code`: `deepseek_not_configured` | `deepseek_auth_failed` | `deepseek_insufficient_balance` | `deepseek_rate_limited` | `deepseek_provider_unavailable` | `deepseek_transport_failed` | `deepseek_timeout` | `deepseek_request_rejected` | `deepseek_model_unresolved` | `deepseek_empty_response` | `deepseek_truncated_response` | `deepseek_response_invalid` | `deepseek_schema_invalid` | `deepseek_model_mismatch` | `invalid_deepseek_probe_request` | `deepseek_gateway_failed`. Type guards MUST accept valid probe ok DTOs, MUST reject `stage` `new` and unknown probe stages on probe requests, MUST reject ok payloads missing `attemptCount` or `providerHttpStatus`, MUST reject `parsed` that does not match `deepseek-gateway-probe-v1`, and MUST NOT treat DeepSeek error codes as members of context-bundle or disclosure blocked unions. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid DeepSeek probe ok is accepted
- **WHEN** the shared runtime validator receives a well-formed probe ok payload with `DeepseekProbeStage`, both model fields, `attemptCount` in 1..3, `providerHttpStatus` 200, and valid `parsed`
- **THEN** validation succeeds

#### Scenario: Probe request with new is rejected
- **WHEN** the shared runtime validator receives a probe request with `stage` `new`
- **THEN** validation fails and MUST NOT treat the request as a valid DeepSeek probe request

#### Scenario: Probe ok missing attemptCount is rejected
- **WHEN** the shared runtime validator receives a probe ok payload without `attemptCount`
- **THEN** validation fails

#### Scenario: DeepSeek codes are not context-bundle blocked members
- **WHEN** shared blocked-union guards for context-bundle or disclosure are inspected
- **THEN** DeepSeek gateway error codes are not members of those blocked unions
