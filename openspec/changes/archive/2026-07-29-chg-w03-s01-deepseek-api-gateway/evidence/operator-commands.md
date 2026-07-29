# Operator commands — chg-w03-s01-deepseek-api-gateway

## Prerequisites

```bash
# In gitignored `.env` (never commit a real key):
DEEPSEEK_API_KEY=

# Optional for live probe; leave empty to exercise deepseek_not_configured.
# Rebuild/restart SpecPilot Compose api if using containers:
# docker compose up -d --build api web
```

## Probe success (live key required)

```bash
set -a && source .env && set +a
PROJECT_ID="<registered-project-uuid>"
curl -sS -X POST "http://localhost:3000/projects/${PROJECT_ID}/deepseek/probe" \
  -H 'content-type: application/json' \
  -d '{}'
# Expect HTTP 200 with schemaId deepseek-gateway-probe-v1, attemptCount, latencyMs
```

## Blocked: missing key

```bash
# With DEEPSEEK_API_KEY unset/blank:
curl -sS -o /tmp/ds-probe.json -w '%{http_code}\n' -X POST \
  "http://localhost:3000/projects/${PROJECT_ID}/deepseek/probe" \
  -H 'content-type: application/json' -d '{}'
# Expect 422 deepseek_not_configured
```

## Blocked: invalid stage

```bash
curl -sS -X POST "http://localhost:3000/projects/${PROJECT_ID}/deepseek/probe" \
  -H 'content-type: application/json' -d '{"stage":"new"}'
# Expect 422 invalid_deepseek_probe_request
```

## OpenSpec (hyphenated)

```text
/opsx-apply
/opsx-verify
/opsx-sync
/opsx-archive
```
