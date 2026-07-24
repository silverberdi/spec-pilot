## 1. Branch setup and scope lock

- [x] 1.1 Create or confirm `wave/w00-project-foundation` from published `main` and `slice/w00-s01-repository-governance-and-openspec-foundation` from that wave branch
- [x] 1.2 Record binding evidence using full IDs: wave `w00`, slice `w00-s01-repository-governance-and-openspec-foundation`, change `chg-w00-s01-repository-governance-and-openspec-foundation`, implementer `cursor`, reviewer `codex`, User Stories `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-003`
- [x] 1.3 Confirm exclusions remain enforced in the working tree (no Nx/Angular/PrimeNG/NestJS/PostgreSQL/Prisma/Docker/DeepSeek/auth/app runtime/GitHub Actions/`w00-s02+` implementation)

## 2. `us-w00-s01-repository-governance-and-openspec-foundation-001` — Core capability adoption

- [x] 2.1 Adopt and correct `AGENTS.md` so it is the shared Cursor/Codex/OpenCode operating contract (roles, hierarchy, Verify `PASS`, immutable integrations, safety) without claiming later-slice completion
- [x] 2.2 Adopt and correct `.cursor/rules/spec-pilot-governance.mdc` to match the same contracts and exclusions
- [x] 2.3 Adopt/align `docs/governance/delivery-methodology.md`, `definition-of-ready.md`, `definition-of-done.md`, and `review-contract.md` with branch model `slice/* → wave/* → main`, exact Verify `PASS`, and deviation synchronization
- [x] 2.4 Document OpenSpec environment authority in adopted docs: CLI `1.6.0`, schema `spec-driven`, profile `custom`, delivery `both`, workflows including `update`
- [x] 2.5 Encode immutable generated-integration policy for `.cursor/commands/`, `.cursor/skills/`, `.codex/skills/`, `.opencode/commands/`, `.opencode/skills/` with refresh only via `openspec update`
- [x] 2.6 Verify integration inventories equal 12 files each surface; if refresh is required, run only `openspec update` (no manual edits)
- [x] 2.7 Explicitly document persistence impact = none and product UI/API impact = none for this slice (satisfies AC4 for all three User Stories: no UI surface)
- [x] 2.8 Adopt and correct `.gitignore` for secret/credential hygiene (exclude `.env`, credentials, and similar secrets) aligned with secret-scan policy; retain evidence that the file was reviewed/corrected

## 3. `us-w00-s01-repository-governance-and-openspec-foundation-002` — Validation and evidence

- [x] 3.1 Adopt and correct `scripts/validate-delivery-graph.py` so it enforces kebab-case IDs and Roadmap→Wave→Slice→User Story→`chg-<slice-id>` integrity (12/42/126)
- [x] 3.2 Adopt and correct `scripts/scan-secrets.py` fail-closed behavior, generated-integration exclusions, and documentation allowlists
- [x] 3.3 Adopt and correct `scripts/regenerate-package-summary.py` plus `docs/context/package-summary-semantics.md` (`fileCount` excludes self; integrations excluded; adoption tracking)
- [x] 3.4 Adopt and correct `scripts/validate-baseline.sh` to be phase-aware: allow this first active change; keep OpenSpec/doctor/inventory/graph/summary/secret checks; still reject excluded product scaffolding
- [x] 3.5 Update `docs/context/file-index.md` and `docs/context/current-state.md` so baseline-era “no OpenSpec change / candidates only” statements match post-adoption reality
- [x] 3.6 Run success-path evidence: `python3 scripts/validate-delivery-graph.py`, `python3 scripts/scan-secrets.py`, `python3 scripts/regenerate-package-summary.py`, `bash scripts/validate-baseline.sh`, `openspec validate --all`, `openspec doctor`; retain transcripts as file evidence for AC2/AC3 on `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, and `us-w00-s01-repository-governance-and-openspec-foundation-003`
- [x] 3.7 Run meaningful failure-path evidence with disposable fixtures (invalid machine ID and/or fake secret sample), assert non-zero exits, retain failure transcripts as file evidence, then restore the tree clean
- [x] 3.8 Record an evidence index (under the change directory, e.g. `evidence/` or closure notes) listing paths to success and failure transcripts so AC3 auditable outcomes are locatable without database persistence

## 4. `us-w00-s01-repository-governance-and-openspec-foundation-003` — Operational experience and closure

- [x] 4.1 Open or update a draft PR from the slice branch to the wave branch for visibility only; record that it is non-merge-eligible until closure gates pass
- [x] 4.2 Produce a closure evidence checklist that maps AC1–AC5 for `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, and `us-w00-s01-repository-governance-and-openspec-foundation-003` to concrete evidence paths (use proposal coverage matrix; no checkbox-only claims)
- [ ] 4.3 Record human validation evidence for GitHub settings that cannot be proven locally (branch protection / required reviewers / integration-branch push restrictions as applicable)
- [x] 4.4 Confirm no hidden deferred acceptance criteria remain for the three bound User Stories
- [ ] 4.5 Run OpenSpec Verify for this change and require exact result `PASS` (reject `PASS WITH NOTES` or any other result); retain Verify output as evidence
- [ ] 4.6 Request mandatory Codex cross-review and obtain verdict `READY_TO_MERGE` or resolve all findings on `CHANGES_REQUIRED` and re-review; retain the verdict artifact
- [ ] 4.7 Sync delta specs to main specs, then archive the change only after Verify `PASS` and required gates are satisfied
- [ ] 4.8 Regenerate final context/package integrity (`regenerate-package-summary.py`, current-state/file-index coherence) and re-run validators as final integrity evidence
- [ ] 4.9 Only after DoD + Codex `READY_TO_MERGE` + human GitHub validation, mark the PR merge-eligible; do not merge prematurely during apply

## 5. Final non-completion guard

- [x] 5.1 Confirm planning/apply artifacts never claim User Story/slice/wave completion without the evidence gates above for `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, and `us-w00-s01-repository-governance-and-openspec-foundation-003`
- [x] 5.2 Confirm excluded future scope remains absent from the diff (no app scaffolding, no CI workflows implementation, no auth/DeepSeek)
