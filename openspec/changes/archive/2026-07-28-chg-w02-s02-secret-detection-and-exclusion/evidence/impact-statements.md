## Impact statements

| Area | Impact |
|---|---|
| Security / privacy | Candidate file bytes read locally via `O_RDONLY\|O_NOFOLLOW` + same-fd `stat`/read for pattern/entropy detection; findings expose path + detectorId only; unsafe empty-after-exclude returns counts only; no DeepSeek/external transmission; no raw secret persistence/logging. |
| Persistence | No Prisma migration; ephemeral scan results only. |
| Budget | No impact (no provider spend). |
| Migration | No schema/data migration. |
| Rollback | Revert API/UI/shared-contracts commits on `main`; no DB rollback required; never touch foreign Docker resources. |
