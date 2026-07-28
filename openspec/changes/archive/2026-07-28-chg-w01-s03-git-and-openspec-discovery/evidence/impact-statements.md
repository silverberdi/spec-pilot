# Impact statements — chg-w01-s03-git-and-openspec-discovery

| Area | Statement |
|---|---|
| Business value | Operators can inspect Git and OpenSpec state for registered projects without mutating targets. |
| Security / privacy | Allowlisted `execFile` Git/OpenSpec CLI; path containment; no PATH OpenSpec; no secret ingestion; no target-repo writes. |
| Persistence | Additive `Project.lastDiscovery` JSON; uses existing `lastInspectedAt`; no discovery history table; no reviews/findings/budgets/auth. |
| Budget | No impact — no DeepSeek or budget ledger in this slice. |
| Migration | Additive Prisma migration `20260728120000_add_project_last_discovery`; local-only; reversible by rollback/reset of SpecPilot DB volume. |
| Rollback | Revert commits + roll back/reset local SpecPilot DB/volume; never touch foreign Docker resources. |
| UI / API | Discovery refresh/get endpoints + minimal Spanish console; no dashboard. |
| Tests | Unit + Testcontainers + web coverage for success and blocked/failure paths. |
