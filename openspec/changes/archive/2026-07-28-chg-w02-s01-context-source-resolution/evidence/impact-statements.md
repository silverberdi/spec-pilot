# Impact statements — `chg-w02-s01-context-source-resolution`

| Area | Impact |
|---|---|
| Security / privacy | Read-only `lstat` walk under canonical repo root; out-of-tree symlinks fail closed; defensive mandatory secret-path excludes; no candidate file-byte reads; no DeepSeek/external transmission; no auth change. |
| Persistence | No Prisma migration; ephemeral resolve only; does not mutate `ProjectConfigurationVersion` / `normalizedConfig`. |
| Budget | No impact — no provider calls or cost ledger. |
| Migration | No impact — no schema migration. |
| Rollback | Revert commits on `main`; no DB volume rollback required for this slice; never touch foreign Docker resources. |
