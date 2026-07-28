# Impact statements

| Area | Impact |
|---|---|
| Security / privacy | Dashboard reads SpecPilot DB only; no new target-repo filesystem/Git/OpenSpec access on list; `summaryMessage` uses closed Spanish mapper (never persisted free-text); no auth/multiuser. |
| Persistence | No schema migration; derives `discoveryHealth` from existing `lastInspectedAt` / `lastDiscovery`; no reviews/findings/budgets/prompts/auth/users. |
| Budget | No-impact — no DeepSeek or budget ledger changes. |
| Migration | No-impact — no Prisma migration for this slice. |
| Rollback | Revert API/UI/contracts; prior discovery persistence remains valid for `w01-s03` endpoints. |
