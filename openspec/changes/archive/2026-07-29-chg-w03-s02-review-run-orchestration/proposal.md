## Why

Wave 3 already has a fail-closed DeepSeek gateway (`w03-s01`), but SpecPilot still cannot persist or execute a review run. Without a durable review-run state machine, later budget control and findings/prompt history have no run identity, lifecycle, or operator-visible execution surface to attach to.

## What Changes

- Add a SpecPilot-owned review-run orchestration capability that persists and executes the `ReviewRun` aggregate for one registered project, one review stage (`new` | `planning` | `applied` | `verify`), and an optional change id.
- Persist explicit run lifecycle states (`requested`, `preparing_context`, `budget_check`, `running`, `validating_response`, `completed`, `blocked`, `failed`, `cancelled`) with fail-closed transitions—invalid transitions and missing prerequisites MUST NOT silently continue as success.
- Bind preparing-context to existing Wave 2 immutable context-bundle identity and disclosure approval prerequisites where the stage requires transmitted context; do not reinvent resolution, secret scanning, bundle creation, or preview/approval semantics.
- Execute the `running` / `validating_response` path through the archived DeepSeek gateway port with schema-validated structured outputs; record safe run metadata (stage, state, model alias/resolved id when available, configuration/context hashes, token/usage summaries, latency, closed error codes)—never API keys or raw secrets.
- Include `budget_check` as a required lifecycle step identity, but do **not** implement monthly estimate/reserve/reconcile/hard-block in this slice (`w03-s03`); this slice MUST NOT invent silent spending loops or claim budget enforcement.
- Persist a minimal completed/blocked/failed run outcome sufficient to prove orchestration (including stage-valid verdict identity when completed) without owning the findings ledger, consolidated prompts, or run-history product surfaces of `w03-s04`.
- Expose project-scoped API create/get/(list or latest) and a Spanish-first operator console with explicit success, blocked, empty, loading, and error outcomes for review runs.
- Add shared contracts/guards for review-run DTOs, stages, states, and closed error codes; add deterministic automated coverage for a successful run path (fake/stub provider and persistence) and at least one meaningful blocked/failure path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w03` |
| Slice | `w03-s02-review-run-orchestration` |
| Change | `chg-w03-s02-review-run-orchestration` |
| User Stories | `us-w03-s02-review-run-orchestration-001`, `us-w03-s02-review-run-orchestration-002`, `us-w03-s02-review-run-orchestration-003` |
| Implementer | Cursor |
| Dependencies | Archived `w03-s01-deepseek-api-gateway`; archived Wave 2 (`w02-s01` … `w02-s04`); archived Wave 1 (`w01-s01` … `w01-s04`); Wave 0 foundation; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release (inspect + DeepSeek calls allowed; no repo edits / delivery execution); ADR-005 portable project contract; binding main-only working policy |
| Exclusions | Monthly budget estimate/reserve/reconcile/hard-block (`w03-s03`); findings ledger, consolidated prompts, and run-history product surfaces (`w03-s04`); stage-specific planning/applied/verify analysis product depth owned by Waves 4–7; providers other than DeepSeek; editing target repositories or executing Git write / OpenSpec apply-verify-sync-archive / delivery workflows from SpecPilot; authentication/multiuser; Windows/Linux support; autonomous spend loops; weakening SpecPilot’s own repository secret scanner / quality gates; Wave 4+ scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Establishes durable, fail-closed review-run identity and lifecycle so supervised DeepSeek analysis can execute as an auditable run—prerequisite for budget hard-block and findings/prompt history. |
| Security / privacy | Reuses Wave 2 disclosure/bundle binding and gateway secret-safe metadata rules; never persists API keys or raw secrets; remains read-only toward target repos; no auth/multiuser. |
| Persistence | Additive Prisma `ReviewRun` (and minimal related outcome/metadata) models owned by `apps/api`; no budget-ledger, finding, prompt-history, auth, or user tables in this slice. |
| UI / API | Project-scoped NestJS review-run APIs + Spanish-first Angular console with success/blocked/empty/loading/error; not a budget console or findings ledger. |
| Tests | Automated success + blocked/failure evidence with fake/stub DeepSeek and deterministic persistence; quality gates continue; do not weaken repo-level secret scanning. |
| Migration | Additive SpecPilot Prisma migration for review-run persistence; no foreign DB/volume changes. |
| Rollback | Reversible by reverting API/UI/orchestration module and rolling back the additive SpecPilot DB migration/volume as documented; never touch foreign Docker resources (including `axioma-db-dev`). |
| Human validation | Operator confirms a successful review-run path and at least one blocked/failure path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `review-run-orchestration`: Persist and execute the project-scoped `ReviewRun` state machine (stages, lifecycle states, fail-closed transitions, gateway-backed running/validation, safe metadata, operator-visible create/get outcomes); exclude budget hard-block and findings/prompt-history product ownership.

### Modified Capabilities

- `deepseek-api-gateway`: Allow review-run orchestration to invoke the existing DeepSeek gateway port for schema-validated analysis steps (beyond the standalone probe console) without relocating budget or findings ownership into the gateway.
- `shared-libraries-baseline`: Allow review-run DTOs, stage/state enums, closed error codes, and type guards in `packages/shared-contracts` without adding Zod-as-default or a separate domain/UI package.
- `nestjs-fastify-api-baseline`: Allow a NestJS review-run orchestration module inside `apps/api` (fakeable ports for tests) without requiring a separate worker deployable for this slice.
- `postgresql-prisma-persistence-baseline`: Allow additive `ReviewRun` (and minimal related outcome/metadata) Prisma models/migration owned by `apps/api`—without budget-ledger, finding, prompt-history, auth, or user tables.
- `local-project-registration`: Allow project-scoped review-run routes under the registered-project API surface without changing realpath identity or registration semantics.
- `context-bundle-manifest`: Allow review runs to bind immutable bundle identity (`id`, `manifestHash`, algorithm/policy ids) as a prerequisite reference without mutating `ContextBundle` rows or reopening create/get/latest Non-Goals.
- `context-preview-and-approval`: Allow review-run preparing-context to require an existing disclosure approval binding where transmission is needed, without mutating approval aggregates into a findings/budget control plane.
- `angular-web-console-baseline`: Allow a Spanish-first review-run operator surface in `apps/web` for success/blocked/empty/loading/error outcomes; not a budget or findings ledger console.
- `application-test-baseline`: Extend automated test expectations to cover review-run success and at least one meaningful blocked/failure path with reproducible evidence under this change.
- `docker-compose-local-runtime`: Allow documenting/wiring any SpecPilot-owned env already required for DeepSeek/API persistence into local Compose without committing secrets or touching foreign containers.

## Impact

- **Repository files:** NestJS review-run orchestration module + APIs; additive Prisma migration; Angular review-run console; shared contracts; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse DeepSeek gateway port, Wave 2 bundle/disclosure identity, NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test fakes; no alternate LLM providers; no auth providers; no required separate worker deployable in this slice.
- **OpenSpec:** New `review-run-orchestration` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No `w03-s03` budget reserve/reconcile/hard-block; no `w03-s04` findings/prompts/history product surfaces; no Waves 4–7 stage-depth product logic; no target-repo writes; no edits to OpenSpec-generated integrations except via `openspec update`; no weakening of SpecPilot repo-level secret scanning; no foreign Docker resources.
- **Risk if skipped:** Wave 3 cannot progress—budget control and findings/prompt history would have no durable run lifecycle or operator-visible orchestration surface.
