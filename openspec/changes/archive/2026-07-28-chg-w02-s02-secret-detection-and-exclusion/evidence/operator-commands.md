# Operator commands (hyphenated OpenSpec syntax)

Planning / lifecycle (operator-approved):

```text
/opsx-apply
/opsx-verify
/opsx-sync
/opsx-archive
```

## Human validation (task 8.1)

Exact operator command (from repo root):

```bash
bash openspec/changes/chg-w02-s02-secret-detection-and-exclusion/evidence/operator-human-validation.sh
```

Requires Compose API on `http://localhost:3000`, `SPECPILOT_HOST_REPOS_ROOT` set (or in gitignored `.env`), and SpecPilot postgres reachable via `docker compose exec`. Rebuild/recreate only SpecPilot `api`/`web` if the `secret-scan` route is missing. Never touch `axioma-db-dev`.

Product API (local):

```bash
# Resolve candidates (unchanged)
curl -sS -X POST "http://127.0.0.1:3000/projects/<project-id>/context-sources/resolve" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'

# Secret scan (this slice)
curl -sS -X POST "http://127.0.0.1:3000/projects/<project-id>/context-sources/secret-scan" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'
```

Console: select project + stage, then **Analizar secretos en fuentes**. Confirm clean success and at least one blocked unsafe/failure path.
