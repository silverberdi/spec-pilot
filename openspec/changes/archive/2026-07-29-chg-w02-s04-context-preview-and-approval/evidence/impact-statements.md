# Impact statements — chg-w02-s04-context-preview-and-approval

| Area | Impact |
|---|---|
| Security / privacy | Preview returns hash-verified selected-range excerpts only; sessions/approvals never persist excerpts, bodies, or secrets; `contentTransmitted` is literal false on approvals only; no DeepSeek/provider calls. |
| Persistence | Additive `ContextDisclosurePreviewSession` + `ContextDisclosureApproval` (append-only); `ContextBundle` unchanged and free of transmission/approval columns. |
| Budget | No impact — no budget reservation or enforcement in this slice. |
| Migration | Additive Prisma migration `20260729120000_add_context_disclosure` only; reversible by rolling back/resetting the local SpecPilot DB/volume. |
| Rollback | Revert API/UI/contracts; drop/ignore disclosure tables via local DB reset; never touch foreign Docker resources or target repositories. |
| UI / API | New preview/approve/status/latest routes and Spanish disclosure console; existing resolve/scan/bundle surfaces unchanged. |
| Tests | Unit + integration + web coverage for success and fail-closed binding matrix. |
