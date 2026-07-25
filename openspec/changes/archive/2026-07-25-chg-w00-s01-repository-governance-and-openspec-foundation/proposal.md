## Why

SpecPilot cannot start technical scaffolding until repository governance, OpenSpec lifecycle rules, agent operating contracts, and canonical context integrity are formally adopted and verifiable. Candidate baseline files already exist from reconciliation, but they are not completed delivery; this first change makes those rules binding with deterministic evidence before any Nx, application, or infrastructure work begins.

## What Changes

- Formally adopt repository governance artifacts (`AGENTS.md`, `.gitignore`, and repository-owned Cursor rules, where applicable) and record the operator-approved, binding main-only working policy: all SpecPilot work is performed directly on `main`; no branches are created per OpenSpec change; Pull Requests are not used; no `slice/* → wave/* → main` hierarchy is adopted; Cursor must not switch branches; Cursor must not create commits or push without explicit operator approval; applicable validations must run and be reported before every commit or push; the operator retains final approval over commit, push, Verify, sync, and archive. Manual, repository-owned Cursor rules are distinct from OpenSpec-generated integrations and must not be treated as generated surfaces.
- Codify the OpenSpec delivery lifecycle for SpecPilot: planning completeness to `APPLY_READY`, Cursor-only apply, exact Verify `PASS` (no `PASS WITH NOTES` closure), then sync, then archive—each of Verify, sync, and archive under final operator approval.
- Bind operating roles: Cursor is the only implementer; Cline with DeepSeek is optional and read-only when used for validation; Codex and OpenCode have no current development, review, validation, or governance role; installed generated integrations do not assign roles.
- Enforce the delivery hierarchy `Roadmap → Wave → Slice → User Stories → OpenSpec tasks`, lowercase kebab-case machine IDs/change names (`chg-<slice-id>`), and deterministic delivery-graph validation.
- Protect immutable OpenSpec-generated integrations under tool-specific directories; allow refresh only via official `openspec update`. Do not manually edit generated integration files.
- Adopt and verify canonical context/index generation and `package-summary.json` integrity semantics (including candidate-baseline tracking outside `fileCount`).
- Adopt deterministic baseline validation and secret-scanning scripts with explicit success and failure behavior.
- Require reproducible closure evidence for this slice’s User Stories, documentation/context synchronization, and final integrity gates—without agent-specific review gates.

### Binding

| Field | Value |
|---|---|
| Wave | `w00` |
| Slice | `w00-s01-repository-governance-and-openspec-foundation` |
| Change | `chg-w00-s01-repository-governance-and-openspec-foundation` |
| User Stories | `us-w00-s01-repository-governance-and-openspec-foundation-001`, `...-002`, `...-003` |
| Implementer | Cursor |
| Dependencies | Reviewed baseline package present in the repository; no predecessor OpenSpec change |
| Exclusions | All product scaffolding for `w00-s02` and later slices (including Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek product API integration, and authentication); CI/CD configuration belonging to later slices; and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Establishes the governed foundation required for every later slice to proceed with bounded, verifiable delivery. |
| Security / privacy | Adopts secret scanning and ignore rules; forbids committing secrets; no authentication or multiuser changes. |
| Persistence | No operational database or Prisma schema changes. |
| UI / API | No product UI or HTTP API surfaces in this slice; operator outcomes are docs, scripts, and OpenSpec commands. |
| Tests | Deterministic validators/scripts cover success and at least one blocked/failure path. |
| Migration | Formal adoption of candidate baseline artifacts; no data migration. |
| Rollback | Reversible file-level reversion of adopted governance/script/docs changes; no destructive recovery required. |
| Human validation | Operator confirms policy/docs readability and that generated OpenSpec hyphenated commands remain copyable; operator gives explicit approval before any commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `repository-governance`: Binding repository operating rules, ignore policy, repository-owned Cursor rules where applicable, and the binding main-only working policy (work on `main` only; no per-change branches; no Pull Requests; no `slice/* → wave/* → main` hierarchy; Cursor must not switch branches or commit/push without explicit operator approval; applicable validations reported before commit/push; operator final approval for commit, push, Verify, sync, and archive).
- `openspec-verified-lifecycle`: Normative OpenSpec lifecycle for SpecPilot with `APPLY_READY`, exact Verify `PASS`, sync-after-verify, and archive-after-sync rules.
- `agent-operating-contracts`: Role boundaries for Cursor, optional read-only Cline validation, and non-roles for Codex/OpenCode/generated integrations.
- `delivery-graph-and-id-validation`: Canonical hierarchy cross-references and lowercase kebab-case identifier/change-name enforcement with deterministic validation.
- `immutable-openspec-integrations`: Immutability of generated OpenSpec integrations and refresh-only-via-`openspec update`.
- `context-and-package-integrity`: Canonical context index, package-summary regeneration/integrity, and candidate-baseline semantics.
- `baseline-validation-and-secret-scanning`: Deterministic baseline validation and repository secret scanning with safe failure behavior.
- `closure-evidence-and-process-gates`: Evidence-backed closure, documentation/context sync requirements, and prohibition of agent-specific review gates / `PASS WITH NOTES` closure.

### Modified Capabilities

- (none — `openspec/specs/` has no existing capabilities yet)

## Impact

- **Repository files:** `AGENTS.md`, `.gitignore`, repository-owned Cursor rules where applicable, `docs/governance/**`, `docs/context/**`, `bootstrap/**` alignment, and related operator docs as needed for formal adoption. OpenSpec-generated integrations are not modified except via `openspec update`.
- **Tooling:** `scripts/validate-baseline.sh`, `scripts/validate-delivery-graph.py`, `scripts/scan-secrets.py`, `scripts/regenerate-package-summary.py`, and `package-summary.json` regeneration/integrity checks.
- **OpenSpec:** New canonical specs under `openspec/specs/<capability>/` after Verify `PASS` and sync; generated integrations remain untouched except via `openspec update`.
- **Systems not touched:** No `w00-s02+` product scaffolding (Nx workspace, Angular/Nest apps, PostgreSQL/Prisma, Docker Compose, DeepSeek gateway, authentication); no later-slice CI/CD configuration; no later-wave scope.
- **Risk if skipped:** Later slices would proceed without binding governance, weak identity/cross-reference integrity, and unverifiable closure—undermining OpenSpec as delivery authority.
