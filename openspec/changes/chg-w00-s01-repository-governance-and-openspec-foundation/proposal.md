## Why

SpecPilot cannot start product scaffolding until repository governance, OpenSpec lifecycle authority, agent operating contracts, and deterministic baseline integrity are formally adopted and verified. Candidate baseline artifacts already exist from reconciliation, but their presence does not complete `w00-s01`; this first change must adopt, correct, test, and prove them with exact Verify `PASS` before any later slice may proceed.

## Binding

| Field | Value |
|---|---|
| Wave | `w00` |
| Slice | `w00-s01-repository-governance-and-openspec-foundation` |
| Change | `chg-w00-s01-repository-governance-and-openspec-foundation` |
| Implementer | `cursor` |
| Mandatory reviewer | `codex` |
| User Stories | `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-003` |

## Business value

Operators gain a single authoritative delivery contract (Roadmap → Wave → Slice → User Stories → OpenSpec tasks), shared Cursor/Codex/OpenCode behavior, and deterministic validation/secret-scan gates so every later slice starts from a governed, merge-gated foundation instead of informal docs.

## What Changes

- Formally adopt and correct candidate baseline artifacts (`AGENTS.md`, governance docs, validation scripts, context index/semantics, Cursor rules, `.gitignore`) as verified delivery for `w00-s01`.
- Codify repository governance: delivery hierarchy, lowercase kebab-case machine IDs, branch model `slice/* → wave/* → main`, and PR targeting rules.
- Codify the OpenSpec expanded verified lifecycle (propose through archive/verify), including exact Verify `PASS`, sync-before-archive ordering, and deviation synchronization.
- Establish shared Cursor, Codex, and OpenCode operating contracts without inventing unapproved ownership.
- Enforce immutable generated OpenSpec integrations; refresh only via official `openspec update`.
- Adopt and harden deterministic validators: delivery-graph/ID checks, baseline validation, secret scan, and package-summary regeneration/integrity.
- Define closure evidence gates, mandatory Codex cross-review (`READY_TO_MERGE` / `CHANGES_REQUIRED`), and human validation for GitHub settings that cannot be proven locally.
- Update current-state/context documentation after adoption so baseline-era “no change yet” statements are corrected with evidence.
- A draft PR may be opened for visibility; the slice remains non-merge-eligible until all canonical closure gates pass.

## Capabilities

### New Capabilities

- `repository-governance`: Delivery hierarchy binding, lowercase machine IDs, branch/PR governance, and scope/exclusion discipline for changes.
- `openspec-verified-lifecycle`: Expanded OpenSpec workflow authority, exact Verify `PASS`, deviation sync, and sync/archive ordering.
- `agent-operating-contracts`: Shared Cursor (implementer), Codex (mandatory reviewer), and OpenCode integration-surface contracts.
- `immutable-openspec-integrations`: Policy that generated integration trees are immutable except via `openspec update`.
- `delivery-graph-and-id-validation`: Deterministic validation of Roadmap → Wave → Slice → User Story → expected change relationships and kebab-case IDs.
- `context-and-package-integrity`: Context indexing, `package-summary.json` semantics, regeneration, and integrity checks.
- `baseline-validation-and-secret-scanning`: Baseline validation script adoption plus heuristic secret scanning with safe failure behavior.
- `closure-evidence-and-cross-review`: Definition-of-Done gates, evidence requirements, Codex cross-review verdicts, and human validation for external GitHub settings.

### Modified Capabilities

- (none — `openspec/specs/` has no existing capabilities)

## Capability → User Story traceability

| Capability | Primary User Story IDs |
|---|---|
| `repository-governance` | `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-003` |
| `openspec-verified-lifecycle` | `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-003` |
| `agent-operating-contracts` | `us-w00-s01-repository-governance-and-openspec-foundation-001` |
| `immutable-openspec-integrations` | `us-w00-s01-repository-governance-and-openspec-foundation-001` |
| `delivery-graph-and-id-validation` | `us-w00-s01-repository-governance-and-openspec-foundation-002` |
| `context-and-package-integrity` | `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-003` |
| `baseline-validation-and-secret-scanning` | `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-001` |
| `closure-evidence-and-cross-review` | `us-w00-s01-repository-governance-and-openspec-foundation-003`, and AC5/DoD evidence for all three stories |

## Acceptance criteria coverage matrix

Each bound User Story shares the same five acceptance criteria (AC1–AC5). Coverage is explicit below (requirements live under `specs/<capability>/spec.md`; tasks under `tasks.md`).

| User Story | AC | Meaning | Requirements (capability) | Tasks |
|---|---|---|---|---|
| `...-001` | AC1 | Explicit contracts; no future scope | `repository-governance`, `openspec-verified-lifecycle`, `agent-operating-contracts`, `immutable-openspec-integrations` | 1.2, 1.3, 2.1–2.5, 2.8, 5.2 |
| `...-001` | AC2 | Success + meaningful failure validation | `baseline-validation-and-secret-scanning`, `immutable-openspec-integrations` (inventory) | 2.6, 3.6, 3.7 |
| `...-001` | AC3 | Explicit, safe, auditable errors | `baseline-validation-and-secret-scanning` (auditable outcomes), `agent-operating-contracts` (evidence), `closure-evidence-and-cross-review` | 2.8, 3.6, 3.7, 3.8, 4.2 |
| `...-001` | AC4 | UI states when UI exists | `closure-evidence-and-cross-review` (persistence/UI none) | 2.7 |
| `...-001` | AC5 | Docs/OpenSpec/context sync | `openspec-verified-lifecycle`, `context-and-package-integrity`, `closure-evidence-and-cross-review` | 3.5, 4.7, 4.8 |
| `...-002` | AC1 | Explicit contracts; no future scope | `delivery-graph-and-id-validation`, `context-and-package-integrity`, `baseline-validation-and-secret-scanning` | 1.3, 3.1–3.5, 5.2 |
| `...-002` | AC2 | Success + meaningful failure validation | `delivery-graph-and-id-validation`, `baseline-validation-and-secret-scanning`, `context-and-package-integrity` | 3.6, 3.7 |
| `...-002` | AC3 | Explicit, safe, auditable errors | `baseline-validation-and-secret-scanning`, `agent-operating-contracts`, `closure-evidence-and-cross-review` | 3.6, 3.7, 3.8, 4.2 |
| `...-002` | AC4 | UI states when UI exists | `closure-evidence-and-cross-review` (persistence/UI none) | 2.7 |
| `...-002` | AC5 | Docs/OpenSpec/context sync | `context-and-package-integrity`, `openspec-verified-lifecycle`, `closure-evidence-and-cross-review` | 3.5, 4.7, 4.8 |
| `...-003` | AC1 | Explicit contracts; no future scope | `repository-governance` (branch/PR), `closure-evidence-and-cross-review` | 1.1, 4.1–4.4, 4.9, 5.2 |
| `...-003` | AC2 | Success + meaningful failure validation | shared validator evidence + Verify exact `PASS` | 3.6, 3.7, 4.5 |
| `...-003` | AC3 | Explicit, safe, auditable errors | `closure-evidence-and-cross-review`, `baseline-validation-and-secret-scanning`, `agent-operating-contracts` | 3.8, 4.2, 4.3, 4.6 |
| `...-003` | AC4 | UI states when UI exists | `closure-evidence-and-cross-review` (persistence/UI none) | 2.7 |
| `...-003` | AC5 | Docs/OpenSpec/context sync | `openspec-verified-lifecycle`, `context-and-package-integrity`, `closure-evidence-and-cross-review` | 4.7, 4.8 |

Full User Story IDs: `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-003`.

## Impact

### Dependencies

- Governed baseline committed/published before this change was proposed.
- OpenSpec CLI `1.6.0`, schema `spec-driven`, profile `custom`, delivery `both`, with active workflows including `update`.
- Existing candidate artifacts and scripts under `AGENTS.md`, `docs/**`, `scripts/**`, and context docs.

### Explicit exclusions

Nx; Angular; PrimeNG; NestJS; PostgreSQL; Prisma; Docker; DeepSeek integration; authentication; application runtime code; GitHub Actions implementation; any `w00-s02+` or future-wave scope.

### Security and privacy

- No application secrets store introduced.
- Secret scan must fail closed on detected credential patterns in tracked content.
- Generated integration trees remain excluded from manual edits and from package inventory.
- No remote multi-user exposure; local-first governance only.
- Never commit live `.env`, credentials, or API keys.

### Persistence impact

**No impact.** No database, Prisma schema, or operational persistence is introduced.

### UI / API impact

**No impact.** No product UI, NestJS API, or Angular console surfaces are introduced. Operational “experience” for this slice is documentation, scripts, Git/PR process, and agent contracts—not application screens.

### Tests

Deterministic scripted validation covering success and meaningful failure paths for delivery-graph/ID rules, baseline checks, secret scan, and package-summary integrity. OpenSpec `validate`/`doctor` evidence required. Exact Verify result must be `PASS` (no `PASS WITH NOTES`).

### Migration and rollback

- Migration: promote candidate baseline artifacts to adopted status via docs/context updates and validator adjustments that recognize the active first change while preserving exclusion of product scaffolding.
- Rollback: revert the change branch/PR; restore pre-adoption current-state wording; keep generated integrations regenerable via `openspec update`. No data migration.

### Human validation

GitHub branch protection, required reviewers, and remote PR settings cannot be fully proven by local scripts. Operator must record human validation evidence for those external settings before merge eligibility. Draft PR visibility is allowed without implying merge readiness.

### Verify and closure

- Verify MUST be exactly `PASS`.
- Sync delta specs (if any) before archive.
- Archive only after Verify `PASS` and remaining DoD gates.
- Codex cross-review MUST return `READY_TO_MERGE` (or work continues on `CHANGES_REQUIRED`).
- Final context/documentation integrity MUST be regenerated and valid.
- Do not mark any User Story complete without evidence.
