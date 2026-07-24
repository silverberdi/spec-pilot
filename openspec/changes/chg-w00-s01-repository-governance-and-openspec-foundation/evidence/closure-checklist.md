# Closure evidence checklist

Maps AC1–AC5 for each bound User Story to concrete evidence paths.
Checkbox-only claims are invalid without the referenced files.

## `us-w00-s01-repository-governance-and-openspec-foundation-001`

| AC | Meaning | Evidence paths |
|---|---|---|
| AC1 | Explicit contracts; no future scope | `../proposal.md`, `../design.md`, `../../../../AGENTS.md`, `../../../../.cursor/rules/spec-pilot-governance.mdc`, `../../../../docs/governance/*.md`, `binding.md`, `exclusions-check.txt`, `gitignore-adoption.md`, `integration-inventory.md` |
| AC2 | Success + meaningful failure validation | `success/validators.txt`, `failure/invalid-machine-id.txt`, `failure/fake-secret-sample.txt`, `failure/restore-confirmation.txt` |
| AC3 | Explicit, safe, auditable errors | `INDEX.md`, `success/validators.txt`, `failure/*`, `gitignore-adoption.md` |
| AC4 | UI states when UI exists | `persistence-and-ui-impact.md` (no UI surface) |
| AC5 | Docs/OpenSpec/context sync | `../../../../docs/context/current-state.md`, `../../../../docs/context/file-index.md`, `../../../../docs/context/package-summary-semantics.md`, sync/archive evidence (pending Verify/Codex gates) |

## `us-w00-s01-repository-governance-and-openspec-foundation-002`

| AC | Meaning | Evidence paths |
|---|---|---|
| AC1 | Explicit contracts; no future scope | `../../../../scripts/validate-*.py`, `../../../../scripts/validate-baseline.sh`, `../../../../scripts/scan-secrets.py`, `../../../../scripts/regenerate-package-summary.py`, `../../../../docs/context/package-summary-semantics.md`, `exclusions-check.txt` |
| AC2 | Success + meaningful failure validation | `success/validators.txt`, `failure/*` |
| AC3 | Explicit, safe, auditable errors | `INDEX.md`, `success/validators.txt`, `failure/*` |
| AC4 | UI states when UI exists | `persistence-and-ui-impact.md` |
| AC5 | Docs/OpenSpec/context sync | context docs above; final integrity pending |

## `us-w00-s01-repository-governance-and-openspec-foundation-003`

| AC | Meaning | Evidence paths |
|---|---|---|
| AC1 | Explicit contracts; no future scope | `binding.md`, `draft-pr.md`, `closure-checklist.md`, `human-github-validation.md`, `no-deferred-ac.md`, `final-guards.md` |
| AC2 | Success + meaningful failure + Verify | `success/validators.txt`, `failure/*`, `verify.txt` (must be exact `PASS`) |
| AC3 | Explicit, safe, auditable errors | `INDEX.md`, `codex-review.md`, `human-github-validation.md` |
| AC4 | UI states when UI exists | `persistence-and-ui-impact.md` |
| AC5 | Docs/OpenSpec/context sync | sync/archive + `final-integrity.txt` (after Verify `PASS`) |

## Merge eligibility gate

Draft PR remains **non-merge-eligible** until:

1. Verify exact `PASS`
2. Codex `READY_TO_MERGE`
3. Human GitHub validation recorded
4. Specs synced and change archived
5. Final integrity validators PASS
