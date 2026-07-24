## Context

Wave `w00`, slice `w00-s01-repository-governance-and-openspec-foundation`, change `chg-w00-s01-repository-governance-and-openspec-foundation`. Implementer: Cursor. Mandatory reviewer: Codex.

Bound User Stories (exact IDs):

- `us-w00-s01-repository-governance-and-openspec-foundation-001`
- `us-w00-s01-repository-governance-and-openspec-foundation-002`
- `us-w00-s01-repository-governance-and-openspec-foundation-003`

The repository already contains a reconciled candidate baseline: governance docs, OpenSpec `1.6.0` (`spec-driven` / `custom` / `both`), generated Cursor/Codex/OpenCode integrations, `AGENTS.md`, `.gitignore`, context docs, and deterministic scripts under `scripts/`. Those artifacts are planning candidates; this change formally adopts, corrects, tests, and verifies them. No `openspec/specs/` capabilities exist yet. Product runtime (Nx/Angular/Nest/Postgres/Docker/DeepSeek/auth) is explicitly out of scope.

Stakeholders: SpecPilot operator (human), Cursor implementer, Codex reviewer, OpenCode as an available integration surface only.

Canonical AC coverage and capability→story traceability live in `proposal.md` (coverage matrix). Every requirement in `specs/**` MUST name full User Story ID(s) via a `Traces to:` line.

## Goals / Non-Goals

**Goals:**

- Adopt repository governance (hierarchy, kebab-case IDs, branch/PR model, exclusions), including `.gitignore` secret/credential hygiene.
- Codify OpenSpec expanded verified lifecycle with exact Verify `PASS` and sync→archive order.
- Publish shared agent operating contracts for Cursor, Codex, and OpenCode.
- Enforce immutable generated OpenSpec integrations (refresh only via `openspec update`).
- Adopt deterministic delivery-graph, baseline, secret-scan, and package-summary integrity checks.
- Define closure evidence, human validation for unprovable GitHub settings, and Codex `READY_TO_MERGE` / `CHANGES_REQUIRED`.
- Leave the change APPLY-ready for `/opsx:apply` without requiring extra planning explanation.

**Non-Goals:**

- Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek, authentication.
- Application runtime code, UI screens, API endpoints, or GitHub Actions workflows.
- Any `w00-s02+` or future-wave implementation.
- Claiming User Stories complete during planning.
- Making a draft PR merge-eligible before closure gates pass.

## Domain boundaries

| Boundary | In scope | Out of scope |
|---|---|---|
| Governance docs & contracts | `docs/governance/**`, `AGENTS.md`, `.cursor/rules/**` | Product domain model runtime |
| OpenSpec planning/delivery | `openspec/config.yaml`, change artifacts, workflows, verify/sync/archive | Parallel lifecycle inventing |
| Validation scripts | `scripts/*.py`, `scripts/validate-baseline.sh` | CI GitHub Actions (w00-s04) |
| Context integrity | `docs/context/**`, `package-summary.json` regenerator | SpecPilot app context bundles (w02+) |
| Integrations | Inventory + immutability policy | Manual edits to generated trees |

## Data model

**No operational persistence.** Artifacts are files in Git:

- Machine IDs: lowercase kebab-case strings (`w00`, `w00-s01-...`, `us-...`, `chg-...`).
- Delivery graph: roadmap waves → wave contracts → slices → user stories → expected `chg-<slice-id>`.
- Package summary: JSON inventory with `fileCount` excluding itself; candidate baseline files tracked separately until promoted by this change’s docs/semantics updates.
- Evidence records: command transcripts, Verify output, Codex review verdict, human-validation notes for GitHub settings.

## API / UI contracts

**No product API or UI.** Operator surfaces for this slice:

- Markdown contracts (`AGENTS.md`, governance docs).
- CLI: `openspec` workflows + `scripts/validate-baseline.sh` and related Python validators.
- Git branch/PR process (`slice/* → wave/* → main`).

UI acceptance criteria on the bound User Stories that refer to loading/empty/error states apply only “when this story has a UI surface”; for `w00-s01` they are satisfied by explicit **no UI surface** documentation and script exit codes (`PASS`/`FAIL` messaging), not Angular components.

## Decisions

### D1 — Adopt candidates in place rather than rewrite from scratch

**Choice:** Correct and formally adopt existing candidate files/scripts instead of replacing them.

**Alternatives:** (a) delete and recreate; (b) leave as “candidate” forever and only add OpenSpec specs.

**Rationale:** Reconciliation already produced coherent validators and contracts; adoption-with-correction minimizes drift and matches `bootstrap/first-change-brief.md`.

### D2 — Keep generated integrations immutable

**Choice:** Never hand-edit `.cursor/commands|skills`, `.codex/skills`, `.opencode/commands|skills`; refresh only with `openspec update`.

**Alternatives:** Hand-patch integrations; vendor forks.

**Rationale:** Official CLI is the single regeneration path; inventories are already asserted by `validate-baseline.sh` (12 files each).

### D3 — Split validation into composable scripts

**Choice:** Retain separate `validate-delivery-graph.py`, `scan-secrets.py`, `regenerate-package-summary.py`, orchestrated by `validate-baseline.sh`.

**Alternatives:** One monolithic validator; defer all checks to future CI (w00-s04).

**Rationale:** Local deterministic checks are required before CI exists; composition keeps failure diagnosis clear.

### D4 — Evolve baseline validator for post-baseline reality

**Choice:** During apply, update `validate-baseline.sh` so “no active OpenSpec change” / “no commits yet” baseline-era assertions become phase-aware (or move into a dedicated baseline-only mode), while preserving delivery-graph, integration counts, secret scan, and package-summary checks for ongoing use.

**Alternatives:** Leave script failing forever after first change; delete script.

**Rationale:** The script is a candidate for adoption; adoption requires it to remain useful after the first change exists.

### D5 — Draft PR allowed; merge eligibility gated

**Choice:** Visibility PR may exist; merge blocked until Verify `PASS`, evidence, Codex `READY_TO_MERGE`, human GitHub validation, sync, archive, and context integrity complete.

**Alternatives:** Forbid any PR until absolute end; treat draft PR as done.

**Rationale:** Matches operator request and Definition of Done without hiding work.

### D6 — No ports/adapters runtime yet

**Choice:** Document modular-monolith intent in ADRs/docs only; do not introduce application modules.

**Rationale:** Runtime boundaries belong to `w00-s02+`; premature scaffolding is an explicit exclusion.

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Non-kebab or mismatched `chg-<slice-id>` | `validate-delivery-graph.py` non-zero | Block closure; fix IDs/refs |
| Secret-like pattern in tracked files | `scan-secrets.py` non-zero | Block; remove/redact; never commit secrets |
| Manual edit to generated integrations | Inventory/drift vs `openspec update` expectation; review | Revert; regenerate via `openspec update` |
| Verify not exactly `PASS` | OpenSpec verify output | Treat as failed; no sync/archive/merge |
| Codex `CHANGES_REQUIRED` | Review artifact | Address findings; re-review |
| GitHub protection unverified | Missing human validation note | Block merge eligibility |
| Scope creep (Nx/app code) | Diff review + baseline “no product scaffolding” check | Reject from this change |

## Security

- Fail closed on secret scan findings for tracked content.
- Exclude generated integration trees from secret-scan noise and from package `fileCount` inventory per existing semantics.
- No credential storage, auth, or remote service binding in this change.
- Preserve `.gitignore` rules that keep `.env` and credential files out of Git.

## Observability

- Validators print explicit `PASS`/`FAIL`/`WARN` lines and non-zero exit on failure.
- Evidence packets for Verify and Codex review are file/transcript based (committed under change docs or attached to PR description as required by tasks).
- No metrics backend.

## Test strategy

Deterministic, local, script-first (aligned with `docs/testing/test-strategy.md` non-negotiables that apply now):

1. **Success path:** clean delivery graph; secret scan clean; package-summary semantics hold; OpenSpec validate/doctor succeed; integration file counts = 12 each.
2. **Failure path (meaningful):** inject temporary invalid ID or fake secret fixture in a disposable path/fixture and assert non-zero exit; restore after.
3. **Verify gate:** only exact `PASS` accepted.
4. **Negative scope:** confirm absence of `apps/`, `packages/`, `package.json` product scaffolding and of GitHub Actions workflow implementation.

Budget/DeepSeek exhaustion tests are **not applicable** until provider integration waves.

## Migration Plan

1. Work on `slice/w00-s01-repository-governance-and-openspec-foundation` targeting `wave/w00-project-foundation` (create wave branch from `main` if needed per methodology).
2. Adopt/correct docs, `AGENTS.md`, rules, and scripts; update `docs/context/current-state.md` and package-summary semantics for adopted baseline files.
3. Run validators; capture evidence; complete tasks with checkboxes only when evidence exists.
4. Open draft PR for visibility if desired; do not merge.
5. Run OpenSpec Verify → must be `PASS`.
6. Codex cross-review → `READY_TO_MERGE` or fix on `CHANGES_REQUIRED`.
7. Human-validate GitHub branch protection / required checks that scripts cannot see.
8. Sync specs to main specs; archive change; regenerate context/package summary; confirm integrity.

**Rollback:**

- Close/abandon PR; delete or revert slice branch commits.
- Restore prior `current-state` wording if needed.
- Re-run `openspec update` if integrations were refreshed incorrectly.
- No database or user-data rollback.

## Auditable error evidence (AC3)

Operational DB persistence remains **none**. For AC3 on all three User Stories, “persisted/auditable where applicable” means:

- Validators MUST emit explicit `PASS`/`FAIL` (or equivalent) outcomes and non-zero exits on failure.
- Success and meaningful failure-path runs MUST retain file/transcript evidence under the change working notes or an `evidence/` path recorded in the closure checklist.
- Secret-scan and delivery-graph failures MUST be fail-closed and captured the same way.
- Checkbox completion without such evidence is invalid (`agent-operating-contracts`).

## Risks / Trade-offs

- [Baseline script phase mismatch] → Mitigate with D4 phase-aware validation modes and explicit tests.
- [Generic User Story templates lack slice-specific ACs] → Mitigate with the proposal coverage matrix, full User Story IDs on every requirement, and mirrored evidence tasks.
- [Human GitHub settings unverifiable locally] → Mitigate with mandatory human-validation evidence gate before merge eligibility.
- [Draft PR mistaken for completion] → Mitigate with explicit non-merge-eligible rule until DoD + Codex READY_TO_MERGE.
- [Over-scoping into w00-s02] → Mitigate with exclusion checklist in proposal/design/tasks and scaffolding absence checks.
- [`.gitignore` adoption omitted from tasks] → Mitigate with explicit US-001 adoption task for `.gitignore`.

## Open Questions

- None blocking APPLY. Wave/slice branch naming follows `docs/governance/delivery-methodology.md` (`slice/* → wave/* → main`); exact GitHub protection settings are recorded during human validation in apply/closure, not during planning.
