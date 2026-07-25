## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w00`, slice `w00-s01-repository-governance-and-openspec-foundation`, User Stories `001–003`, Cursor as implementer, dependencies, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no `w00-s02+` product scaffolding, no later-slice CI/CD, and no later-wave scope; capture the check output in `evidence/exclusions-check.txt`

## 2. Repository governance adoption (US-001, `repository-governance`)

- [x] 2.1 Record the binding main-only working policy in `docs/governance/**` (work on `main` only; no per-change branches; no Pull Requests; no `slice/* → wave/* → main` hierarchy; Cursor must not switch branches; no commit/push without explicit operator approval; validations reported before commit/push; operator final approval over commit, push, Verify, sync, archive)
- [x] 2.2 Align `AGENTS.md` and repository-owned Cursor rules with the main-only policy, keeping them clearly distinct from OpenSpec-generated integrations; do not edit generated files
- [x] 2.3 Verify `.gitignore` adoption against governance requirements (no secrets, local artifacts excluded) and capture the verification in `evidence/gitignore-adoption.md`

## 3. Lifecycle and agent operating contracts (US-001, `openspec-verified-lifecycle`, `agent-operating-contracts`)

- [x] 3.1 Verify governance docs codify the lifecycle: `APPLY_READY` before apply, exact Verify `PASS` (no `PASS WITH NOTES` closure), sync after Verify, archive after sync, each under operator approval; correct any nonconforming wording
- [x] 3.2 Verify role boundaries are documented: Cursor only implementer; Cline with DeepSeek optional and read-only; Codex and OpenCode no current role; generated integrations assign no roles; no agent-specific review gates; correct any nonconforming wording

## 4. Validation tooling adoption (US-001/US-002, `delivery-graph-and-id-validation`, `baseline-validation-and-secret-scanning`, `context-and-package-integrity`, `immutable-openspec-integrations`)

- [x] 4.1 Review and, where needed, correct `scripts/validate-delivery-graph.py` so hierarchy cross-references and lowercase kebab-case IDs are deterministically validated with exit code `0`/non-zero semantics and human-readable failures
- [x] 4.2 Review and, where needed, correct `scripts/scan-secrets.py` so secret-like content fails the scan without weakening the scanner
- [x] 4.3 Review and, where needed, correct `scripts/regenerate-package-summary.py` and `package-summary.json` semantics (self-exclusion from `fileCount`, generated-integration exclusion, candidate-baseline tracking outside `fileCount`)
- [x] 4.4 Review and, where needed, correct `scripts/validate-baseline.sh` so it orchestrates all validators, includes the generated-integration inventory check against `docs/context/file-index.md`, and fails on drift with `openspec update` guidance
- [x] 4.5 Confirm each validator runs standalone and via the orchestrator, offline, deterministically; capture run transcripts in `evidence/`

## 5. Success-path evidence (US-002)

- [x] 5.1 Run the full baseline validation suite on the clean tree and capture passing output (exit codes included) in `evidence/success/validators.txt`
- [x] 5.2 Regenerate `package-summary.json` and capture the integrity-consistent result as evidence

## 6. Failure-path evidence (US-002)

- [x] 6.1 Induce, capture, and restore a delivery-graph/ID failure using a clearly labeled reversible fixture; store output under `evidence/failure/`
- [x] 6.2 Induce, capture, and restore a secret-scan failure using a clearly labeled fake-secret fixture; store output under `evidence/failure/`
- [x] 6.3 Induce, capture, and restore a package-summary integrity failure; store output under `evidence/failure/`
- [x] 6.4 Induce, capture, and restore a generated OpenSpec integrations inventory failure; store output under `evidence/failure/` and confirm the message instructs using `openspec update`
- [x] 6.5 After restoring all fixtures, re-run the full success path to prove the clean state, and record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/`

## 7. Operator-visible outcomes and synchronization (US-003)

- [x] 7.1 Verify operator-facing instructions use complete, copyable, hyphenated `/opsx-*` command syntax; capture the check in `evidence/`
- [x] 7.2 Synchronize `docs/context/**` (current state, file index) with the adopted governance and this change's actual state
- [x] 7.3 Obtain and record operator confirmation of policy/docs readability in `evidence/human-validation.md`
- [x] 7.4 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 8. Closure gates (US-003, `closure-evidence-and-process-gates`)

- [x] 8.1 Report all validation results to the operator and obtain explicit approval to run Verify (no branches, no Pull Requests; Cursor must not commit, push, Verify, sync, or archive without explicit operator approval)
- [x] 8.2 With operator approval, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; if not exact `PASS`, stop and remediate
- [x] 8.3 With operator approval after Verify `PASS`, sync the eight delta specs to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 8.4 After sync, run the applicable integrity gates and capture results
- [x] 8.5 With operator approval, archive the change through the approved lifecycle and record archive evidence
- [x] 8.6 After archive, run the applicable final validations, report `git status` and `git diff` to the operator, and only with explicit operator approval create the final commit on `main` that includes implementation, synchronized specs, and archive; push only if the operator requests it
