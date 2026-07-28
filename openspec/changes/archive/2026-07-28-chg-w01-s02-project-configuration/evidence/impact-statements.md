# Impact statements — `chg-w01-s02-project-configuration`

| Area | Impact |
|---|---|
| Security / privacy | Reads `.specpilot/project.yaml` bytes only; exact-byte hash; no raw YAML in DB; absolute paths remain DB-only; no secret file tree walk; fail-closed attach/refresh; safe client error bodies. |
| Persistence | Additive `ProjectConfigurationVersion` + `Project.configurationVersionId`; unique `(projectId, sourceHash)`; transactional insert+pointer. |
| Budget | No budget ledger or enforcement; only validates declared `monthlyBudgetUsd` when present. |
| Migration | Additive Prisma migration `20260728000000_add_project_configuration_version`; apply via `prisma migrate deploy`. |
| Rollback | Revert commits + roll back/reset local SpecPilot DB/volume only; never touch foreign Docker resources. |
| UI / API | `RegisterProjectResponse` on 201; refresh/get configuration endpoints; minimal Spanish console attach/refresh outcomes. |
| Tests | Unit + shared-contracts + web + Testcontainers integration coverage for success and blocked paths. |
