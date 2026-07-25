# Impact statements (US-002)

Recorded after failure-path restoration and full success-path re-run.

| Area | Impact |
|---|---|
| Security / privacy | Secret scanning adopted; `.gitignore` excludes secrets; failure fixtures neutralized; evidence quarantine under change `evidence/` for secret scan. No authentication/multiuser changes. |
| Persistence | No operational database or Prisma schema changes. |
| Budget | No DeepSeek spend or budget-system changes (no impact). |
| Migration | Formal adoption of candidate governance/script/docs artifacts; no data migration. |
| Rollback | File-level Git revert on `main`; no infrastructure rollback. |

Validators after restoration: delivery-graph exit 0, secret scan exit 0, baseline orchestrator `BASELINE_OK` (see `failure/restore-confirmation.txt` and `success/validators.txt`).
