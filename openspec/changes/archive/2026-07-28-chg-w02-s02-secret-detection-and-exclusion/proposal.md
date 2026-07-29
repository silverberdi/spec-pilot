## Why

Wave 2 already resolves deterministic stage-scoped candidate path sets (`w02-s01`), but SpecPilot still does not inspect candidate *file contents* for secrets. Secure context assembly cannot advance to immutable manifests or preview/approval while credential-like content can remain inside an otherwise “resolved” path set. This slice prevents secret disclosure and blocks unsafe bundles before any later bundling or provider transmission.

## What Changes

- Scan the resolved candidate path set for a registered project and requested review stage for secret-bearing *content* using deterministic pattern checks plus bounded entropy/credential detectors (exact detector set and thresholds decided in design).
- Exclude detected secret-bearing paths (and any design-approved safe redaction/omit rules) from the eligible context set; when findings cannot be safely excluded while retaining sufficient evidence, **block** the bundle as unsafe rather than silently continuing.
- Fail closed: missing/inactive project or configuration, unresolved or failed context-source resolution, unreadable candidate files, detector/config errors, or incomplete scan results MUST NOT produce a “safe” eligible set.
- Remain read-only toward target repositories: scan MUST NOT create, modify, or delete files; MUST NOT execute Git, OpenSpec, Cursor/Cline delivery, tests, commits, or PR workflows from SpecPilot; MUST NOT transmit file contents to DeepSeek or any external provider.
- Never persist raw secret values; any persisted or returned finding metadata MUST use safe fields only (e.g. path, detector id/category, exclusion/block reason)—exact shape in design.
- Expose operator-visible scan outcomes (API and Spanish-first console) with explicit success (eligible set after exclusions), empty, blocked (unsafe bundle), loading, and error behavior—not an immutable bundle manifest, content preview, or approval gate.
- Add only bounded shared contracts / DTOs required for scan request/response; prefer ephemeral scan results unless design requires a bounded local audit/snapshot row without secret values.
- Add deterministic automated coverage for the primary success path (clean candidates → eligible set) and at least one meaningful blocked/failure path (detected secret → unsafe bundle blocked).
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w02` |
| Slice | `w02-s02-secret-detection-and-exclusion` |
| Change | `chg-w02-s02-secret-detection-and-exclusion` |
| User Stories | `us-w02-s02-secret-detection-and-exclusion-001`, `us-w02-s02-secret-detection-and-exclusion-002`, `us-w02-s02-secret-detection-and-exclusion-003` |
| Implementer | Cursor |
| Dependencies | Archived `w02-s01-context-source-resolution` (candidate path resolve API + defensive mandatory path excludes); archived Wave 1 (`w01-s01` … `w01-s04`); ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release + minimal disclosure; ADR-005 portable project contract; binding main-only working policy; Wave 0 foundation including repo-level `baseline-validation-and-secret-scanning` (distinct from this product scan) |
| Exclusions | Immutable context-bundle manifests, content hashes, and token estimates (`w02-s03`); context preview and approval gates (`w02-s04`); DeepSeek product API calls, reviews, findings ledger as review evidence, budget enforcement, prompts; editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; Windows/Linux support; Wave 3+ review engine and all later-wave scope; weakening SpecPilot’s own repository secret scanner / quality gates to pass fixtures |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Gives operators a fail-closed content safety gate on resolved candidates so later Wave 2 bundling cannot treat secret-bearing paths as eligible context. |
| Security / privacy | Reads candidate file bytes only for local deterministic secret detection; blocks unsafe bundles; never persists or returns raw secret values; no auth/multiuser; no external transmission. |
| Persistence | Prefers ephemeral scan results built on resolve + existing `Project` / active `ProjectConfigurationVersion`; additive local persistence only if design requires a bounded scan/audit row without secret values—still no reviews, findings-as-product-ledger, budgets, prompts, auth, or users. |
| UI / API | Project-scoped secret-scan / eligible-set API and Spanish-first console outcomes with clear empty/loading/success/blocked/error states; not a delivery control plane, full content preview, or approval workflow. |
| Tests | Automated success + blocked/failure evidence for secret detection and exclusion; quality gates continue to apply; do not weaken repo-level secret scanning. |
| Migration | Additive only if design introduces a scan/audit table or field; otherwise no migration; no production or ownership migration. |
| Rollback | Reversible by reverting API/UI (and any additive migration) as documented; roll back/reset only local SpecPilot DB/volume; never touch foreign Docker resources. |
| Human validation | Operator confirms a clean scan success path and at least one blocked unsafe-bundle path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `secret-detection-and-exclusion`: Scan resolved stage candidate paths for secret-bearing content; exclude unsafe paths from the eligible context set or block the bundle when safe exclusion is insufficient; fail closed on incomplete or erroneous scans; remain read-only toward target repositories; never persist raw secrets; expose operator-visible API/console outcomes without manifests, preview/approval, or provider transmission.

### Modified Capabilities

- `context-source-resolution`: Allow this slice to consume the resolved candidate path set (and related resolve identity fields such as stage / configuration version) as the input to content scanning; do not replace path-level mandatory excludes or reopen resolve Non-Goals beyond what scanning needs.
- `shared-libraries-baseline`: Allow shared scan request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `local-project-registration`: Allow project-scoped secret-detection / eligible-set endpoints (or equivalent) under the registered-project API surface without changing realpath identity or presence/registration semantics.
- `angular-web-console-baseline`: Allow a minimal Spanish-first secret-detection operator surface in `apps/web` for success/empty/blocked/loading/error outcomes; not a full Wave 2 preview/approval console.
- `application-test-baseline`: Extend automated test expectations to cover secret-detection success and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** NestJS secret-detection domain/API; Angular minimal scan outcomes UI; shared contracts for scan DTOs; docs/context and package-summary updates as needed; optional additive Prisma only if design requires a scan/audit snapshot without secret values.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; may add a pinned local detector library only if design requires it; no new auth providers; no DeepSeek gateway; no worker app; no delivery runners.
- **OpenSpec:** New `secret-detection-and-exclusion` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No immutable bundle manifests/token estimates (`w02-s03`); no preview/approval (`w02-s04`); no target-repo mutation; no DeepSeek product calls; no auth; no Wave 3+ review engine; no edits to OpenSpec-generated integrations except via `openspec update`; no weakening of SpecPilot repo-level `baseline-validation-and-secret-scanning`.
- **Risk if skipped:** Later Wave 2 slices would build manifests and previews over unresolved secret content, violating minimal-disclosure (ADR-004 + context-and-privacy) and allowing unsafe bundles to look ready for provider submission.
