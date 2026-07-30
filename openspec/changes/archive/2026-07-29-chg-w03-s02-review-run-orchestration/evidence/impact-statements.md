# Impact statements — chg-w03-s02-review-run-orchestration

## Security / privacy

- Review-run DTOs, logs, and transmission rows persist only safe metadata (ids, hashes, codes, usage/latency, verdict/rationale).
- Excerpts, prompts, raw provider bodies, reasoning, and API keys are not persisted or returned.
- Wave 2 aggregates (`ContextBundle`, preview sessions, approvals) are never mutated; `contentTransmitted` remains false.
- SpecPilot repo CI secret scanning is unchanged and not weakened.
- Compose continues to forward only `DEEPSEEK_API_KEY` (gitignored env); no committed secrets.

## Persistence

- Additive Prisma models: `ReviewRun`, `ReviewRunTransition`, `ContextDisclosureTransmission`.
- Unique `ContextDisclosureTransmission.reviewRunId`; no `ReviewRun.transmissionId` scalar.
- Partial unique index enforces at most one in-flight run per project.
- No budget, findings, prompt-history, auth, or user tables in this slice.

## Budget

- `budgetCheckStatus = not_enforced` only. No estimate/reserve/reconcile/hard-block.

## Migration / rollback

- Migration `20260729200000_add_review_run_orchestration` is additive.
- Rollback is drop of new tables/index (no destructive rewrite of Wave 2 data).
- Existing probe routes and public probe DTO behavior remain unchanged.

## No-impact notes

- No target-repo writes, delivery/Git/OpenSpec apply-verify-sync-archive controls, worker/SSE/cancel, or alternate providers.
- No Waves 4–7 stage-depth product logic; no findings ledger / prompt history product surfaces (`w03-s04`).
