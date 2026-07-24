# Evidence index

Change: `chg-w00-s01-repository-governance-and-openspec-foundation`

Auditable outcomes for AC3 (no operational DB persistence). Paths are relative to this change directory.

## Binding and scope

| Evidence | Path |
|---|---|
| Binding IDs | `evidence/binding.md` |
| Exclusions check | `evidence/exclusions-check.txt` |
| Persistence / UI none | `evidence/persistence-and-ui-impact.md` |
| `.gitignore` adoption | `evidence/gitignore-adoption.md` |
| Integration inventory (12×5) | `evidence/integration-inventory.md` |

## Success-path validation (AC2/AC3)

| Evidence | Path |
|---|---|
| Validators + openspec validate/doctor | `evidence/success/validators.txt` |

Commands covered: `regenerate-package-summary.py`, `validate-delivery-graph.py`, `scan-secrets.py`, `validate-baseline.sh`, `openspec validate --all`, `openspec doctor`.

## Failure-path validation (AC2/AC3)

| Evidence | Path |
|---|---|
| Invalid machine ID (non-zero) | `evidence/failure/invalid-machine-id.txt` |
| Fake secret sample (non-zero) | `evidence/failure/fake-secret-sample.txt` |
| Tree restore confirmation | `evidence/failure/restore-confirmation.txt` |

## Closure artifacts (filled as gates complete)

| Evidence | Path |
|---|---|
| Closure AC checklist | `evidence/closure-checklist.md` |
| Draft PR / non-merge note | `evidence/draft-pr.md` |
| Human GitHub validation | `evidence/human-github-validation.md` |
| OpenSpec Verify output | `evidence/verify.txt` (pending exact `PASS`) |
| Codex cross-review verdict | `evidence/codex-review.md` (pending) |
| Final integrity re-run | `evidence/final-integrity.txt` (pending) |
| Deferred-AC confirmation | `evidence/no-deferred-ac.md` |
| Non-completion / exclusion guard | `evidence/final-guards.md` |
