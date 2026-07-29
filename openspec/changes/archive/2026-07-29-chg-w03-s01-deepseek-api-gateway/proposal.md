## Why

Wave 2 closed secure context assembly (resolve → secret-scan → immutable bundles → disclosure preview/approval), but SpecPilot still cannot call DeepSeek. Wave 3 review-engine work cannot start until a bounded provider gateway can invoke DeepSeek V4 Flash and Pro with fail-closed structured JSON outputs—without yet owning review runs, budgets, or findings.

## What Changes

- Add a SpecPilot-owned DeepSeek API gateway that calls the official OpenAI-compatible DeepSeek endpoint for configurable V4 Flash and Pro model aliases, requiring structured JSON responses validated against local schemas.
- Fail closed on schema validation failures, transport/auth/configuration errors, and unsafe payloads; retry only explicitly allowed transient transport or rate-limit failures (never semantic failures).
- Resolve model routing from project configuration / documented aliases (`deepseek-v4-flash`, `deepseek-v4-pro` or the current official equivalents verified at apply time) without inventing alternate providers.
- Persist or return only provider **request/response metadata** needed to prove gateway behavior (model alias, resolved model id when available, status, latency, token/usage summaries when provided)—never API keys, never raw secret values, never uncontrolled full request dumps with credentials.
- Expose a minimal operator-visible probe/invoke surface (API and Spanish-first console) with explicit success, blocked, loading, empty (where applicable), and error outcomes so the gateway is exercisable without a full review-run control plane.
- Keep transmission of approved context-bundle excerpts as a **gateway-capable** concern only insofar as the gateway accepts bounded, schema-validated structured requests; do **not** implement review-run orchestration, automatic multi-step analysis pipelines, budget reserve/reconcile/hard-block, findings ledger, or prompt history in this slice.
- Add shared contracts/guards for gateway request/response and closed error codes; add deterministic automated coverage for a successful structured call (fake/stub provider) and at least one meaningful blocked/failure path (schema failure, missing config/key, or transport failure).
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w03` |
| Slice | `w03-s01-deepseek-api-gateway` |
| Change | `chg-w03-s01-deepseek-api-gateway` |
| User Stories | `us-w03-s01-deepseek-api-gateway-001`, `us-w03-s01-deepseek-api-gateway-002`, `us-w03-s01-deepseek-api-gateway-003` |
| Implementer | Cursor |
| Dependencies | Archived Wave 2 (`w02-s01` … `w02-s04`, including disclosure preview/approval); archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release (inspect + DeepSeek calls allowed; no repo edits / delivery execution); ADR-005 portable project contract; binding main-only working policy |
| Exclusions | Review-run state machine / orchestration (`w03-s02`); monthly budget estimate/reserve/reconcile/hard-block (`w03-s03`); findings ledger, consolidated prompts, and run history product surfaces (`w03-s04`); providers other than DeepSeek; editing target repositories or executing Git write / OpenSpec apply-verify-sync-archive / delivery workflows from SpecPilot; authentication/multiuser; Windows/Linux support; separate worker deployable required for this slice; weakening SpecPilot’s own repository secret scanner / quality gates; Wave 4+ scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Unlocks supervised DeepSeek analysis by proving SpecPilot can call Flash/Pro with structured, schema-validated outputs under fail-closed rules—foundation for later review runs and budget control. |
| Security / privacy | API key only via local env/secrets (never committed); no raw secret values in gateway logs/responses; schema fail-closed; no auth/multiuser; remains read-only toward target repos. |
| Persistence | Additive gateway/provider-call metadata only if design requires a durable probe/audit row; no review-run, budget-ledger, finding, prompt, auth, or user tables in this slice. |
| UI / API | Minimal Spanish-first probe/invoke console + NestJS gateway API with clear success/blocked/loading/error states; not a full review-run or budget console. |
| Tests | Automated success + blocked/failure evidence using fake/stub DeepSeek ports; quality gates continue; do not weaken repo-level secret scanning. |
| Migration | Additive Prisma migration only if design persists provider-call metadata; otherwise no schema migration. |
| Rollback | Reversible by reverting API/UI/gateway module and rolling back any additive SpecPilot DB migration/volume as documented; never touch foreign Docker resources (including `axioma-db-dev`). |
| Human validation | Operator confirms a successful structured gateway probe/invoke and at least one blocked/failure path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `deepseek-api-gateway`: Integrate DeepSeek V4 Flash/Pro via the official OpenAI-compatible API with structured JSON outputs validated against local schemas; fail closed on schema/config/transport errors; retry only allowed transient failures; expose minimal operator-visible probe/invoke outcomes; never persist API keys or raw secrets; exclude review-run orchestration, budget hard-block, and findings/prompt history.

### Modified Capabilities

- `shared-libraries-baseline`: Allow DeepSeek gateway request/response DTOs, closed error codes, and type guards in `packages/shared-contracts` without adding Zod-as-default or a separate domain/UI package.
- `nestjs-fastify-api-baseline`: Allow a NestJS DeepSeek gateway module/client inside `apps/api` (fakeable port for tests) without requiring a separate worker service for this slice.
- `postgresql-prisma-persistence-baseline`: Allow an optional additive provider-call metadata model/migration owned by `apps/api` if design requires durable gateway audit—without review-run, budget, finding, prompt, auth, or user tables.
- `project-yaml-configuration`: Allow reading existing provider/model-routing fields needed to resolve Flash/Pro aliases for gateway calls; do not add budget enforcement semantics (owned by `w03-s03`).
- `local-project-registration`: Allow project-scoped gateway probe/invoke routes under the registered-project API surface without changing realpath identity or registration semantics.
- `angular-web-console-baseline`: Allow a minimal Spanish-first DeepSeek gateway probe/invoke operator surface in `apps/web` for success/blocked/loading/error outcomes; not a review-run or budget control plane.
- `application-test-baseline`: Extend automated test expectations to cover gateway structured-success and at least one meaningful blocked/failure path with reproducible evidence under this change.
- `docker-compose-local-runtime`: Allow documenting/wiring SpecPilot-owned env for the DeepSeek API key into the local Compose API service without committing secrets or touching foreign containers.

## Impact

- **Repository files:** NestJS DeepSeek gateway module/client + probe API; optional Prisma migration; Angular minimal probe UI; shared contracts; docs/context and package-summary updates as needed.
- **Dependencies:** Official DeepSeek OpenAI-compatible HTTP API; reuse NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test fakes; no alternate LLM providers; no auth providers; no required separate worker deployable in this slice.
- **OpenSpec:** New `deepseek-api-gateway` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No `w03-s02` review-run state machine; no `w03-s03` budget reserve/hard-block; no `w03-s04` findings/prompts/history product surfaces; no target-repo writes; no edits to OpenSpec-generated integrations except via `openspec update`; no weakening of SpecPilot repo-level secret scanning; no foreign Docker resources.
- **Risk if skipped:** Wave 3 cannot progress—later slices would have no fail-closed, schema-validated provider path to DeepSeek Flash/Pro.
