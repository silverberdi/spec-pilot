# Impact statements — chg-w02-s03-context-bundle-manifest

| Area | Impact |
|---|---|
| Business value | Durable hashed, token-estimated context bundles for later preview/approval and review evidence. |
| Security / privacy | Same-bytes local pipeline; no raw secrets/bytes in DTOs/DB/logs; no DeepSeek transmission; no `contentTransmitted` on immutable rows. |
| Persistence | Additive immutable `ContextBundle` Prisma table; append-only create; cascade delete with Project; no FK to configuration version. |
| Budget | No budget reservation or enforcement in this slice (local token estimate only). |
| UI / API | POST create (201), GET by id, GET latest limit=1; Spanish console without preview/approval. |
| Tests | Unit + Testcontainers + web coverage for success and blocked/failure paths; public secret-scan regression retained. |
| Migration | Additive `context_bundles` migration only. |
| Rollback | Revert commits; migrate down / reset local SpecPilot DB volume only; never touch foreign Docker resources. |
| Human validation | Required: operator confirms clean success and at least one blocked/failure path before Verify/closure. |
