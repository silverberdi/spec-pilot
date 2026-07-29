## Why

Wave 2 already produces immutable, hash-addressed context-bundle manifests (`w02-s03`), but operators still cannot preview the exact content that would be disclosed or record an explicit disclosure approval before a first or policy-changing run. Secure context assembly cannot close while transmission-ready bundles lack a human disclosure gate bound to a stable `ContextBundle` identity.

## What Changes

- Let operators preview the disclosable content for a selected immutable `ContextBundle` (paths, selected line ranges, and bounded file-body excerpts derived from those ranges) after binding to `bundleId` + `manifestHash`, without mutating the bundle row.
- Require explicit disclosure approval before first or policy-changing runs for that project/stage/policy identity; fail closed when no valid prior approval covers the current bundle/policy, when preview integrity checks fail, or when the request is otherwise unsafe.
- Persist disclosure preview/approval outcomes in a **separate related audit aggregate** (approval decision and transmission-readiness fields as decided in design)—never by updating or deleting `ContextBundle`, and never by storing raw secret values.
- Remain read-only toward target repositories: preview/approval MUST NOT create, modify, or delete repository files; MUST NOT execute Git, OpenSpec, Cursor/Cline delivery, tests, commits, or PR workflows from SpecPilot; MUST NOT call DeepSeek or any external provider.
- Expose operator-visible preview and approval outcomes (API and Spanish-first console) with explicit success, empty, blocked, loading, and error behavior—distinct from resolve, secret-scan, and context-bundle create surfaces.
- Add only bounded shared contracts / DTOs required for preview and approval request/response; keep review runs, budget reservation, findings ledger, and provider transmission for later waves.
- Add deterministic automated coverage for the primary success path (preview + approval against a valid bundle) and at least one meaningful blocked/failure path (for example missing approval, integrity mismatch, or policy-changing re-approval required).
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s04-context-preview-and-approval` |
| Change | `chg-w02-s04-context-preview-and-approval` |
| User Stories | `us-w02-s04-context-preview-and-approval-001`, `us-w02-s04-context-preview-and-approval-002`, `us-w02-s04-context-preview-and-approval-003` |
| Implementer | Cursor |
| Dependencies | Archived `w02-s01-context-source-resolution`; archived `w02-s02-secret-detection-and-exclusion`; archived `w02-s03-context-bundle-manifest` (immutable `ContextBundle` identity + entries); archived Wave 1 (`w01-s01` … `w01-s04`); ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release + minimal disclosure; ADR-005 portable project contract; binding main-only working policy; Wave 0 foundation |
| Exclusions | DeepSeek product API calls and provider payload transmission; review runs / findings ledger as review evidence; budget reservation/enforcement; prompts; mutating `ContextBundle` rows for approval or transmission; editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; Windows/Linux support; Wave 3+ review engine and all later-wave scope; weakening SpecPilot’s own repository secret scanner / quality gates to pass fixtures |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Gives operators a bounded preview of disclosable context and an explicit approval gate before first or policy-changing runs, so Wave 2 can close secure context assembly without silent transmission readiness. |
| Security / privacy | Reads only clean, bundle-bound selected ranges locally for operator preview; never persists or returns raw secret values; records approval in a separate audit aggregate; no auth/multiuser; no external transmission. |
| Persistence | Additive disclosure preview/approval audit persistence in SpecPilot PostgreSQL/Prisma; no mutation of immutable `ContextBundle`; no reviews, findings-as-product-ledger, budgets, prompts, auth, or users. |
| UI / API | Project-scoped preview and approval API plus Spanish-first console outcomes with clear empty/loading/success/blocked/error states; not a delivery control plane or DeepSeek send workflow. |
| Tests | Automated success + blocked/failure evidence for preview and approval; quality gates continue to apply; do not weaken repo-level secret scanning. |
| Migration | Additive Prisma migration for the disclosure/approval audit aggregate/fields decided in design; no production or ownership migration. |
| Rollback | Reversible by reverting API/UI and rolling back/resetting only the local SpecPilot DB/volume as documented; never touch foreign Docker resources. |
| Human validation | Operator confirms a successful preview + approval path and at least one blocked/failure path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `context-preview-and-approval`: Preview disclosable content for an immutable `ContextBundle`, require explicit disclosure approval before first or policy-changing runs, persist a separate related audit record without mutating the bundle, remain read-only toward target repositories, never persist raw secrets or call external providers, and expose operator-visible API/console outcomes with explicit success/empty/blocked/loading/error behavior.

### Modified Capabilities

- `context-bundle-manifest`: Allow this slice to consume immutable `ContextBundle` identity (`id`, `manifestHash`, entries, algorithm/policy ids) as the sole disclosure target for preview/approval; clarify that approval/transmission audit MUST NOT mutate `ContextBundle` rows or reopen create/get Non-Goals beyond supplying that identity.
- `postgresql-prisma-persistence-baseline`: Allow an additive disclosure/approval audit Prisma model/migration owned by `apps/api`, without introducing SQLite or non-PostgreSQL stores and without adding `contentTransmitted` (or equivalent) columns onto immutable `ContextBundle`.
- `shared-libraries-baseline`: Allow shared preview/approval request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `local-project-registration`: Allow project-scoped preview and approval endpoints (or equivalent) under the registered-project API surface without changing realpath identity or presence/registration semantics.
- `angular-web-console-baseline`: Allow a minimal Spanish-first context preview and disclosure-approval operator surface in `apps/web` for success/empty/blocked/loading/error outcomes; not a DeepSeek send console or review-run control plane.
- `application-test-baseline`: Extend automated test expectations to cover preview/approval success and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** NestJS preview/approval domain/API and Prisma migration; Angular minimal preview/approval UI; shared contracts for preview/approval DTOs; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; no new auth providers; no DeepSeek gateway; no worker app; no delivery runners.
- **OpenSpec:** New `context-preview-and-approval` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No DeepSeek product calls or provider transmission; no budget reservation; no review runs; no auth; no Wave 3+ review engine; no mutation of `ContextBundle`; no edits to OpenSpec-generated integrations except via `openspec update`; no weakening of SpecPilot repo-level `baseline-validation-and-secret-scanning`.
- **Risk if skipped:** Wave 2 would close without an operator disclosure gate, allowing later review runs to treat hashed bundles as transmission-ready without preview or explicit approval, violating minimal-disclosure (ADR-004 + context-and-privacy).
