## MODIFIED Requirements

### Requirement: Domain packages and shared UI kit are excluded
This change MUST NOT introduce separate product domain packages or a shared UI kit. PrimeNG UI remains in `apps/web` until a later approved change extracts shared UI. `packages/shared-contracts` MAY export registration, project-configuration, discovery, project-dashboard health/list, context-source-resolution, secret-detection-and-exclusion, context-bundle-manifest, context-preview-and-approval, deepseek-api-gateway, and review-run-orchestration request/response and error contracts required by those capabilities without becoming a domain package or UI kit.

#### Scenario: No extra domain or shared UI packages
- **WHEN** `packages/` is inspected for this change’s scope
- **THEN** no project-registry, review, budget, or shared UI kit packages are delivered beyond `packages/shared-contracts`

#### Scenario: Review-run contracts may live in shared-contracts
- **WHEN** shared contracts for review-run create/get/list DTOs, lifecycle states, transitions, transmission safe metadata, and closed review-run error codes are required by API and web
- **THEN** those contracts MAY be exported from `packages/shared-contracts` without introducing a separate domain package

## ADDED Requirements

### Requirement: Review-run orchestration contracts and validators are exported
`packages/shared-contracts` MUST export TypeScript contracts for review-run create request `{ stage: ReviewStage; contextBundleId: string; changeId?: string }`, review-run lifecycle states, stage-valid verdict unions, transition DTOs, safe transmission metadata DTOs, list wrappers, and closed codes including `invalid_review_run_request`, `review_run_not_found`, `review_run_in_progress`, `review_context_bundle_required`, `review_context_bundle_stage_mismatch`, `review_disclosure_approval_required`, `review_disclosure_policy_mismatch`, `review_context_integrity_mismatch`, `review_context_limit_exceeded`, `review_model_unresolved`, `review_run_invalid_transition`, `review_run_interrupted`, `review_schema_invalid`, `review_verdict_invalid`, and `review_run_failed`. Type guards MUST reject unknown create fields, invalid `changeId` shapes, and ok payloads that include excerpts, prompts, raw provider bodies, or secrets. Zod MUST NOT be added unless a later planning reconciliation documents a concrete technical necessity.

#### Scenario: Valid review-run create request is accepted
- **WHEN** the shared runtime validator receives `{ stage: 'planning', contextBundleId: '…', changeId: 'chg-example' }`
- **THEN** validation succeeds

#### Scenario: Create request with unknown field is rejected
- **WHEN** the shared runtime validator receives a create body containing an unknown property
- **THEN** validation fails

#### Scenario: Ok DTO with excerpt field is rejected
- **WHEN** the shared runtime validator receives a review-run ok payload that includes an excerpt or prompt body field
- **THEN** validation fails
