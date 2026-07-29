## Why

Wave 2 can resolve stage-scoped candidates (`w02-s01`) and fail-closed secret-scan them into an eligible path set (`w02-s02`), but SpecPilot still has no durable, immutable context-bundle manifest with content hashes and token estimates. Preview/approval and later review runs cannot bind disclosure to a stable, auditable bundle identity while that gap remains.

## What Changes

- Build an immutable context-bundle manifest for a registered project and requested review stage from the post–secret-scan eligible path set (server MUST re-resolve and re-scan in-process; clients MUST NOT supply path lists or file contents).
- For each included entry, record repository-relative path, content hash, selected line ranges (selection policy decided in design; full-file ranges allowed when section reduction is not yet required), exclusion metadata for omitted candidates where applicable, and a deterministic token estimate for the selected content.
- Persist the manifest as an immutable `ContextBundle` (or equivalent) aggregate without storing raw secret values, full transmitted payloads, or target-repository mutations; fail closed when resolve/scan fails, the bundle is unsafe, files are unreadable, bounds are exceeded, or hashing/token estimation cannot complete safely.
- Remain read-only toward target repositories: manifest creation MUST NOT create, modify, or delete repository files; MUST NOT execute Git, OpenSpec, Cursor/Cline delivery, tests, commits, or PR workflows from SpecPilot; MUST NOT transmit file contents to DeepSeek or any external provider.
- Expose operator-visible manifest outcomes (API and Spanish-first console) with explicit success, empty, blocked, loading, and error behavior—hashes, token estimates, and safe exclusion summaries—not a content preview pane or disclosure approval gate.
- Add only bounded shared contracts / DTOs required for create/get (or equivalent) request/response; keep disclosure decision / “content transmitted” flags for later preview/approval or review-run ownership unless design proves a minimal local field is required for audit completeness without preview UX.
- Add deterministic automated coverage for the primary success path (eligible set → immutable manifest with hashes and token estimate) and at least one meaningful blocked/failure path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s03-context-bundle-manifest` |
| Change | `chg-w02-s03-context-bundle-manifest` |
| User Stories | `us-w02-s03-context-bundle-manifest-001`, `us-w02-s03-context-bundle-manifest-002`, `us-w02-s03-context-bundle-manifest-003` |
| Implementer | Cursor |
| Dependencies | Archived `w02-s01-context-source-resolution`; archived `w02-s02-secret-detection-and-exclusion` (eligible set + unsafe-bundle block); archived Wave 1 (`w01-s01` … `w01-s04`); ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release + minimal disclosure; ADR-005 portable project contract; binding main-only working policy; Wave 0 foundation |
| Exclusions | Context preview UI that displays file contents and disclosure approval gates (`w02-s04`); DeepSeek product API calls, review runs, findings ledger as review evidence, budget reservation/enforcement, prompts; editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; Windows/Linux support; Wave 3+ review engine and all later-wave scope; weakening SpecPilot’s own repository secret scanner / quality gates to pass fixtures |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Gives operators a durable, hash-addressed, token-estimated context bundle so later Wave 2 preview/approval and review runs can bind disclosure to a stable auditable identity instead of ad-hoc path lists. |
| Security / privacy | Reads eligible file bytes only locally for hashing, range selection, and token estimation after secret-scan eligibility; never persists or returns raw secret values; no auth/multiuser; no external transmission. |
| Persistence | Additive immutable `ContextBundle` (or equivalent) persistence in SpecPilot PostgreSQL/Prisma; no reviews, findings-as-product-ledger, budgets, prompts, auth, or users. |
| UI / API | Project-scoped context-bundle create/get (or equivalent) API and Spanish-first console outcomes with clear empty/loading/success/blocked/error states; not a delivery control plane, full content preview, or approval workflow. |
| Tests | Automated success + blocked/failure evidence for manifest creation (hashes + token estimates); quality gates continue to apply; do not weaken repo-level secret scanning. |
| Migration | Additive Prisma migration for the immutable bundle aggregate/fields decided in design; no production or ownership migration. |
| Rollback | Reversible by reverting API/UI and rolling back/resetting only the local SpecPilot DB/volume as documented; never touch foreign Docker resources. |
| Human validation | Operator confirms a successful manifest path (hashes + token estimate visible) and at least one blocked/failure path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `context-bundle-manifest`: Create and persist immutable stage-scoped context-bundle manifests from the post–secret-scan eligible set, including content hashes, selected line ranges, exclusion metadata, and deterministic token estimates; fail closed on unsafe or incomplete inputs; remain read-only toward target repositories; never persist raw secrets; expose operator-visible API/console outcomes without preview/approval or provider transmission.

### Modified Capabilities

- `secret-detection-and-exclusion`: Allow this slice to consume the eligible path set (and related identity fields such as stage / configuration version) as the sole input to manifest construction via in-process re-scan; do not reopen scan Non-Goals beyond what hashing/token estimation needs.
- `context-source-resolution`: Allow the manifest pipeline to depend on resolve as the upstream path enumerator (still via secret-scan’s required in-process resolve); do not replace path-level mandatory excludes or reopen resolve Non-Goals.
- `postgresql-prisma-persistence-baseline`: Allow an additive immutable `ContextBundle` (or equivalent) Prisma model/migration owned by `apps/api`, without introducing SQLite or non-PostgreSQL stores.
- `shared-libraries-baseline`: Allow shared context-bundle request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `local-project-registration`: Allow project-scoped context-bundle create/get endpoints (or equivalent) under the registered-project API surface without changing realpath identity or presence/registration semantics.
- `angular-web-console-baseline`: Allow a minimal Spanish-first context-bundle operator surface in `apps/web` for success/empty/blocked/loading/error outcomes (hashes, token estimates, safe summaries); not a Wave 2 preview/approval console.
- `application-test-baseline`: Extend automated test expectations to cover context-bundle success (immutable manifest with hashes and token estimate) and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** NestJS context-bundle domain/API and Prisma migration; Angular minimal manifest outcomes UI; shared contracts for bundle DTOs; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; may add a pinned local tokenizer/estimator only if design requires it; no new auth providers; no DeepSeek gateway; no worker app; no delivery runners.
- **OpenSpec:** New `context-bundle-manifest` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No content preview/approval (`w02-s04`); no target-repo mutation; no DeepSeek product calls; no budget reservation; no auth; no Wave 3+ review engine; no edits to OpenSpec-generated integrations except via `openspec update`; no weakening of SpecPilot repo-level `baseline-validation-and-secret-scanning`.
- **Risk if skipped:** Later Wave 2 preview/approval and review runs would lack a stable hashed, token-estimated bundle identity, breaking audit expectations (context-and-privacy) and forcing unsafe ad-hoc reassembly of context at disclosure time.
