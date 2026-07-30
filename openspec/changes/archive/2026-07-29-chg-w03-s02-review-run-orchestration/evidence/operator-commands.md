# Operator commands — chg-w03-s02-review-run-orchestration
#
# Safety (binding):
# - Never print/inspect DEEPSEEK_API_KEY values (presence checks only).
# - Operate only on SpecPilot-owned compose resources (`specpilot-*`, `specpilot-net`,
#   `specpilot-postgres-data`). Never touch `axioma-db-dev` or foreign volumes.
# - No database/volume resets. No target-repo writes outside disposable fixtures.
# - Disposable projects under SPECPILOT_HOST_REPOS_ROOT must be cleaned up explicitly.
# - Prefer the script below for reproducible human validation (A–F).

Set `DEEPSEEK_API_KEY` only via gitignored repo-root `.env` (Compose forwards it). Never commit secrets.

## Preferred reproducible validation

```bash
# From repo root. Rebuild SpecPilot api only (preserves postgres data; does not
# recreate volumes; does not touch axioma-db-dev).
docker compose up -d --build api

# Apply additive migrations only (no reset):
docker compose exec -T api npx prisma migrate deploy

# Full human-validation matrix (success / blocked / failed-invalid-key /
# missing-key temp container / concurrency / stale / Wave2 immutability).
# Writes sanitized smoke + report under evidence/success/.
bash openspec/changes/chg-w03-s02-review-run-orchestration/evidence/operator-human-validation.sh
```

The script:
- creates disposable fixtures under `SPECPILOT_HOST_REPOS_ROOT` and deletes them on exit;
- deletes disposable `projects` rows by id via SpecPilot postgres only;
- uses a temporary `specpilot-api-nokey-hv` / invalid-key harness container on an alternate host port, then removes it;
- never dumps `.env`, API keys, excerpts, prompts, raw provider bodies, or Authorization.

## Manual curl (after prerequisites from the script or prior Wave 2 flows)

Success (`new`):

```bash
curl -sS -X POST "http://localhost:3000/projects/<projectId>/review-runs" \
  -H 'content-type: application/json' \
  -d '{"stage":"new","contextBundleId":"<bundleId>"}'
```

Blocked (bundle without covering approval): expect HTTP 201 `state=blocked`, closed code, zero transmissions.

Get / list:

```bash
curl -sS "http://localhost:3000/projects/<projectId>/review-runs/<runId>"
curl -sS "http://localhost:3000/projects/<projectId>/review-runs?limit=20"
```

## OpenSpec hyphen commands (operator; do not run until 12.1 authorization)

- `/opsx-verify`
- `/opsx-sync`
- `/opsx-archive`

Do not Verify/sync/archive/commit/push without the single continuous 12.1 authorization.
