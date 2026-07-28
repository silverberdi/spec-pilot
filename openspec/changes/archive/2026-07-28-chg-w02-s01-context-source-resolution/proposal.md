## Why

Wave 1 left SpecPilot with registered projects, validated `ProjectConfigurationVersion` snapshots (including `context.include` / `context.exclude`), discovery health, and a multi-project dashboard—but nothing yet turns that configured context into a concrete, stage-scoped candidate file set. Secure context assembly (`w02`) cannot start with secret scanning, manifests, or preview until SpecPilot can deterministically resolve which repository paths belong to a requested review stage’s configured source set, fail closed on invalid or unsafe resolution, and show that outcome to the operator.

## What Changes

- Resolve stage-specific configured source sets for a registered project and requested review stage (`new` | `planning` | `applied` | `verify`) from the active validated configuration and the local registered repository tree.
- Apply deterministic include/exclude matching against repository-relative paths, honoring mandatory secret-path excludes already merged into `normalizedConfig.context.exclude`, and reject path escapes outside the registered repository root.
- Fail closed: missing/inactive configuration, unsupported stage, unreadable repository root, pattern/escape violations, or incomplete resolution MUST NOT silently produce a partial “healthy” source set.
- Remain read-only toward target repositories: resolution MUST NOT create, modify, or delete files; MUST NOT execute Git, OpenSpec, Cursor/Cline delivery, tests, commits, or PR workflows from SpecPilot; MUST NOT transmit file contents to DeepSeek or any external provider.
- Expose operator-visible resolve outcomes (API and console) with explicit success, empty, blocked, loading, and error behavior for the resolved candidate path set (and supporting summary fields decided in design)—not a full context preview, secret-content scanner, or immutable bundle manifest.
- Add only bounded shared contracts / DTOs required for resolve request/response; persist resolution artifacts only if design requires a local audit/snapshot for this slice—otherwise keep resolution ephemeral.
- Add deterministic automated coverage for the primary success path (valid project + stage → resolved candidate set) and at least one meaningful blocked/failure or empty path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s01-context-source-resolution` |
| Change | `chg-w02-s01-context-source-resolution` |
| User Stories | `us-w02-s01-context-source-resolution-001`, `us-w02-s01-context-source-resolution-002`, `us-w02-s01-context-source-resolution-003` |
| Implementer | Cursor |
| Dependencies | Archived Wave 1 (`w01-s01` … `w01-s04`): durable `Project` registry, immutable `ProjectConfigurationVersion` with `normalizedConfig.context.include`/`exclude`, discovery + dashboard baselines; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release; ADR-005 portable project contract; binding main-only working policy; Wave 0 foundation |
| Exclusions | Secret-content detection / unsafe-bundle blocking beyond path-level configured excludes (`w02-s02`); immutable context-bundle manifests, content hashes, and token estimates (`w02-s03`); context preview and approval gates (`w02-s04`); DeepSeek product API calls, reviews, findings, budget enforcement/ledger, prompts; editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; Windows/Linux support; Wave 3+ review engine and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Gives operators a deterministic, stage-scoped candidate source set from validated project configuration—the prerequisite for later secure context assembly without inventing ad-hoc file picking. |
| Security / privacy | Read-only filesystem walk of the registered repo under configured include/exclude; enforce repository-root containment and mandatory secret-path excludes; do not ingest or display secret file contents; no auth/multiuser; no external transmission. |
| Persistence | Prefers ephemeral resolve results from existing `Project` + active `ProjectConfigurationVersion`; additive local persistence only if design requires a bounded resolution snapshot/audit row—still no reviews, findings, budgets, prompts, auth, or users. |
| UI / API | Project-scoped resolve API and Spanish-first console outcomes with clear empty/loading/success/blocked/error states for candidate path sets; not a delivery control plane and not full content preview. |
| Tests | Automated success + empty/blocked/failure evidence for stage source resolution; quality gates continue to apply. |
| Migration | Additive only if design introduces a resolution snapshot table/field; otherwise no migration; no production or ownership migration. |
| Rollback | Reversible by reverting API/UI (and any additive migration) as documented; roll back/reset only local SpecPilot DB/volume; never touch foreign Docker resources. |
| Human validation | Operator confirms a successful stage resolve for a valid registered project and at least one empty or blocked path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `context-source-resolution`: Resolve deterministic, stage-specific candidate path sets for a registered project from validated configuration include/exclude rules and the local repository tree; enforce repository-root containment and mandatory secret-path excludes; fail closed on invalid or incomplete resolution; remain read-only toward target repositories; expose operator-visible API/console outcomes without secret-content scanning, bundle manifests, preview/approval, or provider transmission.

### Modified Capabilities

- `project-yaml-configuration`: Allow resolution to consume the active `normalizedConfig.context.include` / `context.exclude` (including mandatory secret-path excludes). If design requires bounded stage-specific source-profile overlays within `schemaVersion: 1` to differentiate stages, extend parse/validate/normalize requirements accordingly; otherwise do not expand the portable contract beyond what resolution needs to consume.
- `shared-libraries-baseline`: Allow shared resolve request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `local-project-registration`: Allow project-scoped context-source resolve endpoints (or equivalent) under the registered-project API surface without changing realpath identity or presence/registration semantics.
- `angular-web-console-baseline`: Allow a minimal Spanish-first context-source-resolution operator surface in `apps/web` for success/empty/blocked/loading/error outcomes; not a full Wave 2 preview/approval console.
- `application-test-baseline`: Extend automated test expectations to cover stage source-resolution success and at least one meaningful empty or blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** NestJS resolve domain/API; Angular minimal resolve outcomes UI; shared contracts for resolve DTOs; docs/context and package-summary updates as needed; optional additive Prisma only if design requires a resolution snapshot.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; no new auth providers; no DeepSeek gateway; no worker app; no delivery runners.
- **OpenSpec:** New `context-source-resolution` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No secret-content detectors (`w02-s02`); no immutable bundle manifests/token estimates (`w02-s03`); no preview/approval (`w02-s04`); no target-repo mutation; no DeepSeek product calls; no auth; no Wave 3+ review engine; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Later Wave 2 slices would invent ad-hoc file selection without a fail-closed, stage-scoped contract, weakening minimal-disclosure (ADR-004/ADR-005 + context architecture) and allowing unsafe or incomplete path sets to look ready for scanning and bundling.
