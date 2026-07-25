## Context

SpecPilot's repository currently holds a reconciled canonical baseline: governance documents (`AGENTS.md`, `docs/governance/**`), canonical context (`docs/context/**`, `package-summary.json`), delivery planning (roadmap, wave contracts, 126 User Stories), candidate validation scripts (`scripts/**`), and OpenSpec configuration (`openspec/config.yaml`). These artifacts exist as **candidates**: their presence does not constitute completed delivery.

This change formally adopts them as binding governance, with deterministic validation evidence, before any product scaffolding begins. There is no product code, database, UI, or API in this slice. The "implementation" surface is documentation, repository policy, validation tooling, and OpenSpec lifecycle discipline.

Constraints inherited from canonical sources:

- Delivery hierarchy `Roadmap → Wave → Slice → User Stories → OpenSpec tasks`; one slice maps to one lowercase kebab-case change (`chg-<slice-id>`).
- Cursor is the only implementer; Cline with DeepSeek is optional read-only validation; Codex and OpenCode have no current role.
- OpenSpec-generated integrations are immutable except via `openspec update`.
- Verify must be exactly `PASS`; `PASS WITH NOTES` never closes work.
- All SpecPilot work is performed directly on `main`; this change records that policy as binding (see D2).

## Goals / Non-Goals

**Goals:**

- Formally adopt repository governance artifacts and record the binding main-only working policy (no change branches, no Pull Requests, no `slice/* → wave/* → main` hierarchy).
- Make the OpenSpec lifecycle (`APPLY_READY` → apply → Verify exactly `PASS` → sync → archive) normative and testable for this repository, with the operator retaining final approval on commits, push, Verify, sync, and archive.
- Bind agent operating roles and non-roles as verifiable governance rules, including: Cursor must not switch branches; Cursor must not create commits or push without explicit operator approval; applicable validations must run and be reported before any commit or push.
- Provide deterministic, evidence-producing validation: delivery-graph/ID validation, baseline validation, secret scanning, and package-summary integrity.
- Protect generated OpenSpec integrations from manual edits.
- Establish the closure-evidence pattern (success and failure paths, reproducible outputs, no hidden deferred acceptance criteria) that later slices will reuse.

**Non-Goals:**

- No product scaffolding for `w00-s02` and later slices (Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek product API integration, authentication).
- No CI/CD configuration belonging to later slices.
- No later-wave scope, no agent-specific review gates, no `.specpilot/project.yaml` runtime behavior (that is product functionality, not repository governance).
- No editing of OpenSpec-generated integration files.
- No short-lived change branches, no Pull Requests, no merge requirements, and no `slice/*` / `wave/*` branch hierarchy.

## Decisions

### D1 — Adopt candidate baseline artifacts in place, not rewrite them

Adoption means: the change's specs declare the normative requirements, the tasks verify each adopted artifact against those requirements, and evidence records the verification. Files are edited only where they conflict with the adopted requirements.

- *Alternative considered:* regenerate governance docs from scratch. Rejected — the reconciled baseline is already canonical content; rewriting adds churn and risks divergence from the reviewed package.

### D2 — Main-only working policy (no change branches, no Pull Requests)

Record in `docs/governance/**` (and align related operator contracts such as `AGENTS.md` / repository-owned Cursor rules where applicable) the following binding policy:

- All SpecPilot work is performed directly on `main`.
- No branches are created per OpenSpec change.
- Pull Requests are not used.
- No `slice/* → wave/* → main` (or similar) branch hierarchy is adopted.
- Cursor must not switch branches.
- Cursor must not create commits or push without explicit operator approval.
- Before every commit or push, applicable validations must be executed and their results reported.
- The operator retains final approval over commits, push, Verify, sync, and archive.

- *Alternative considered:* short-lived change-scoped branches with Pull Requests and operator merge review. Rejected — adds ceremony without benefit for a single-implementer, main-only workflow; conflicts with the operator's chosen working model.
- *Alternative considered:* full GitFlow-style wave/slice branch model. Rejected — explicitly identified by the baseline correction as unapproved; would add ceremony with a single implementer.

### D3 — Deterministic validation via existing repository-owned scripts

Keep validation in the candidate scripts (`scripts/validate-baseline.sh` orchestrating `validate-delivery-graph.py`, `scan-secrets.py`, and package-summary integrity), adopted and, where needed, corrected so that:

- exit code `0` means pass, non-zero means fail, with human-readable reasons on stderr/stdout;
- runs are deterministic for the same working tree (no network, no timestamps in compared output);
- each validator can run standalone and through the orchestrator;
- the same validators are the "applicable validations" that must run and be reported before any operator-approved commit or push (D2).

- *Alternative considered:* adopt a test framework (pytest/Jest) now. Rejected — introduces toolchain scope that belongs to later slices; plain scripts with exit codes are sufficient, deterministic evidence.

### D4 — Generated-integration immutability enforced by rule plus inventory check

Immutability is a governance rule (`AGENTS.md`, repository-owned Cursor rules where applicable) verified by an inventory check in baseline validation: generated integration directories must match the expected file inventory recorded in canonical context (`docs/context/file-index.md`), and any drift fails validation with an instruction to run `openspec update` rather than manual edits.

- *Alternative considered:* content hashing of every generated file. Rejected — hashes break on every legitimate `openspec update`, creating noisy maintenance; inventory-level checking catches manual additions/deletions at appropriate cost.

### D5 — Evidence layout under the change directory

All closure evidence lives in `openspec/changes/chg-w00-s01-repository-governance-and-openspec-foundation/evidence/`, with success outputs and at least one induced, safely-reversible failure output per validator (e.g., a temporary fixture with a fake secret pattern for the secret scanner, an invalid machine ID fixture for the delivery-graph validator). Fixtures are created, exercised, captured, and removed within the evidence run; nothing sensitive-looking is left in tracked history outside clearly-labeled fixture evidence.

- *Alternative considered:* evidence in `docs/`. Rejected — evidence is change-scoped, travels with the change through archive, and must not pollute canonical docs.

### D6 — Repository-owned Cursor rules are distinct from generated surfaces

Repository-owned Cursor rules (currently `.cursor/rules/spec-pilot-governance.mdc`) are manual governance artifacts adopted by this change where applicable. Generated command/skill directories are never edited manually. The design does not mandate a specific manual-rules path beyond what exists; adoption applies to repository-owned rules wherever they live.

### D7 — Sync model for canonical specs

The eight capabilities' delta specs live under the change's `specs/` directory during planning and implementation. Canonical `openspec/specs/<capability>/spec.md` files are created only at sync time, after Verify is exactly `PASS`, using the OpenSpec sync flow. No canonical spec is hand-created ahead of Verify. Sync and archive themselves require operator approval (D2).

## Risks / Trade-offs

- [Governance-only change produces little "code" and risks checkbox-driven closure] → Every task requires captured command output or file evidence; User Story `-002` explicitly demands a failure-path demonstration per validator.
- [Inventory check (D4) misses in-place edits to generated files] → Accepted trade-off vs. hash churn; manual-edit prohibition remains enforced by rule and review, and drift in file sets is still caught deterministically.
- [Working exclusively on `main` raises the cost of a bad commit] → Mitigated by mandatory pre-commit/pre-push validation reporting and explicit operator approval before any commit or push; Cursor must not self-commit or self-push.
- [Operator approval gates could be skipped under automation pressure] → Governance docs and repository-owned Cursor rules state the prohibition explicitly; closure evidence must show validation results reported before any approved commit/push related to this change.
- [Failure fixtures (fake secrets, invalid IDs) could be mistaken for real problems] → Fixtures are clearly labeled, confined to evidence paths, and removed or neutralized after capture; the secret scanner's own allowlist must not be weakened to pass.
- [Scripts may drift from docs they validate] → `regenerate-package-summary.py` remains the single regeneration path; baseline validation fails on count/inventory mismatch, forcing synchronized updates.

## Migration Plan

1. Verify each candidate artifact against the adopted requirements; correct only nonconforming content.
2. Record the main-only working policy (D2) in governance docs and align related operator contracts; do not introduce branch, PR, or merge workflows.
3. Run all validators; capture success evidence.
4. Induce and capture one failure path per validator; restore clean state and re-run success path.
5. Synchronize `docs/context/**` and regenerate `package-summary.json`.
6. With operator approval after reported validation results: commit and (if requested) push on `main`.
7. With operator approval: reach Verify exactly `PASS`, then sync canonical specs, then archive.

**Rollback:** all changes are file-level and tracked in Git on `main`; reverting the adopting commits restores the pre-adoption candidate state. No data, schema, or infrastructure rollback exists in this slice. No branch-based rollback path is assumed.

## Open Questions

- None. The main-only working policy (D2) is decided and binding; no branch/PR wording sign-off remains.
