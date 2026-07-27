# Impact statements

| Area | Impact |
|---|---|
| Business value | Local repositories can be registered and validated as durable Project records for later w01 slices. |
| Security / privacy | Absolute paths stored only in PostgreSQL; registration reads metadata/presence/realpath only; no secret file contents ingested; no auth/multiuser; 500 responses omit stacks and file contents. |
| Persistence | Additive `projects` table with unique `repository_path` and `slug`; `AppMetadata` retained; no `ProjectConfigurationVersion`. |
| Budget | No impact (no DeepSeek spend in this slice). |
| UI / API | `POST/GET /projects` and minimal Spanish registration surface; no dashboard. |
| Migration | Additive Prisma migration only; local/empty DB apply via `prisma migrate deploy`. |
| Rollback | Revert commits and roll back/reset SpecPilot local DB/volume only; no foreign Docker impact. |
| Human validation | Operator must confirm register success and one blocked path before closure authorization. |
