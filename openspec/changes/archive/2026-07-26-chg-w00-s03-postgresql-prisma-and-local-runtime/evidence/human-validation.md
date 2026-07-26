# Human validation — chg-w00-s03-postgresql-prisma-and-local-runtime

Status: **CONFIRMED**

## Operator confirmation (2026-07-25 local / 2026-07-26 UTC)

| Check | Result |
|---|---|
| `GET /health` | PASS — HTTP 200 with exact body `{"status":"ok","service":"api"}` |
| `GET /health/ready` (Postgres up) | PASS — HTTP 200 with `{"status":"ok","service":"api","database":"ok"}` |
| Web shell on `localhost:8081` | PASS — HTTP 200 with `Content-Type` text/html |
| SpecPilot Compose services | PASS — `specpilot-api`, `specpilot-postgres`, and `specpilot-web` running |
| SpecPilot Postgres host port | PASS — `specpilot-postgres` healthy on host port `5441` |
| Foreign container coexistence | PASS — `axioma-db-dev` remained running and unchanged on host port `5440` |
| `axioma-db-dev` identity | PASS — ID `fbdabca10675efab7137dc95fbb31bfa89d4070508d07aaf9b6cd8795438c48f`, StartedAt `2026-07-24T06:02:19.896124Z` |

Readiness failure (HTTP 503 with non-ok database status when SpecPilot Postgres is stopped) was previously captured under `evidence/failure/compose-ready-blocked.txt` and is included in this operator-approved human validation for US-003.

- Operator: SpecPilot operator
- Date: 2026-07-25 (local)
- Result: ACCEPTED for task 7.1

No secrets or foreign credentials are stored in this evidence file.
