# Impact statements (US-002)

| Area | Statement |
|---|---|
| Security / privacy | No authentication. Non-secret local Compose credentials only. Real `.env` gitignored. Secret scan required before commit. |
| Persistence | PostgreSQL + Prisma 7.9.0 with committed migrations; probe model `app_metadata` only. |
| Budget | No DeepSeek / LLM usage in this slice — no-impact. |
| Migration | Greenfield `prisma migrate deploy` for empty SpecPilot DB; no production/Axioma migration. |
| Rollback | Revert commits; `docker compose -p specpilot down` + remove `specpilot-postgres-data` only. |
| Foreign Docker | **No impact** on `axioma-db-dev` (host 5440) — coexistence evidence PASS; SpecPilot isolated on 5441. |
