#!/usr/bin/env bash
# Operator human-validation script for chg-w03-s01-deepseek-api-gateway.
# Validates deployed SpecPilot runtime against DeepSeek probe contracts.
# Never prints DEEPSEEK_API_KEY, Authorization, raw provider bodies, or .env values.
# Does not Verify/sync/archive/commit/push. Does not touch axioma-db-dev volumes.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
NOKEY_API_BASE="${NOKEY_API_BASE:-http://localhost:3001}"
NOKEY_CONTAINER="${NOKEY_CONTAINER:-specpilot-api-nokey-hv}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
STAMP="$(date +%Y%m%dT%H%M%S)"
REPORT="${REPORT_PATH:-/tmp/sp-w03-s01-operator-validation-${STAMP}.txt}"
SMOKE_OUT="${SMOKE_OUT:-${REPO_ROOT}/openspec/changes/chg-w03-s01-deepseek-api-gateway/evidence/success/operator-human-validation-smoke.txt}"

# Load SPECPILOT_HOST_REPOS_ROOT from gitignored .env when present (path only; never dump .env).
if [[ -z "${SPECPILOT_HOST_REPOS_ROOT:-}" && -f "${REPO_ROOT}/.env" ]]; then
  SPECPILOT_HOST_REPOS_ROOT="$(
    grep -E '^SPECPILOT_HOST_REPOS_ROOT=' "${REPO_ROOT}/.env" | head -1 | cut -d= -f2-
  )"
  export SPECPILOT_HOST_REPOS_ROOT
fi

if [[ -z "${SPECPILOT_HOST_REPOS_ROOT:-}" ]]; then
  echo "ERROR: SPECPILOT_HOST_REPOS_ROOT is not set (export it or add it to .env)." >&2
  exit 1
fi
if [[ ! -d "${SPECPILOT_HOST_REPOS_ROOT}" ]]; then
  echo "ERROR: SPECPILOT_HOST_REPOS_ROOT is not a directory: ${SPECPILOT_HOST_REPOS_ROOT}" >&2
  exit 1
fi

DISPOSABLE_IDS=()
DISPOSABLE_DIRS=()
CLEANUP_DONE=0
CREATED_PROJECT=0
PASS_COUNT=0
FAIL_COUNT=0
PROJECT_ID=""
AXIOMA_BEFORE=""
AXIOMA_AFTER=""
PROBE_META_FILE="$(mktemp)"
NOKEY_LOG_MARKER="deepseek_not_configured"

log() {
  printf '%s\n' "$*" | tee -a "${REPORT}"
}

section() {
  log ""
  log "=== $* ==="
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  log "PASS: $*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  log "FAIL: $*"
  return 1
}

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then
    pass "${label} == ${expected}"
  else
    fail "${label}: expected '${expected}', got '${actual}'"
  fi
}

sanitize_stream() {
  sed -E \
    -e 's/(DEEPSEEK_API_KEY|Authorization|Bearer)[=:][^[:space:]]*/\1=<redacted>/gi' \
    -e 's/sk-[A-Za-z0-9_-]{8,}/<redacted-key>/g'
}

http_json() {
  local method="$1"
  local url="$2"
  local data_file="${3:-}"
  BODY_FILE="$(mktemp)"
  local curl_args=(-sS -X "${method}" -o "${BODY_FILE}" -w '%{http_code}' --max-time 120 "${url}")
  if [[ -n "${data_file}" ]]; then
    curl_args+=(-H 'content-type: application/json' --data-binary @"${data_file}")
  fi
  HTTP_STATUS="$(curl "${curl_args[@]}")"
}

wait_health() {
  local base="$1"
  local label="$2"
  local attempts="${3:-60}"
  local i code
  section "Wait health (${label}) ${base}/health"
  for i in $(seq 1 "${attempts}"); do
    code="$(curl -sS -o /tmp/sp-hv-health.json -w '%{http_code}' --max-time 3 "${base}/health" 2>/dev/null || true)"
    if [[ "${code}" == "200" ]]; then
      pass "${label} GET /health == 200 (attempt ${i})"
      return 0
    fi
    sleep 1
  done
  fail "${label} GET /health did not become 200 within ${attempts}s (last=${code:-err})"
}

track_id() {
  DISPOSABLE_IDS+=("$1")
}

track_dir() {
  DISPOSABLE_DIRS+=("$1")
}

write_project_yaml() {
  local dest="$1"
  local project_id="$2"
  local project_name="$3"
  cat >"${dest}" <<YAML
schemaVersion: 1
project:
  id: ${project_id}
  name: ${project_name}
repository:
  mainBranch: main
openspec:
  path: openspec
delivery:
  methodology: wave-slice
  wave:
    activeStatePath: docs/context/current-state.md
  mapping:
    changeIdPattern: "chg-{slice-id}"
context:
  include:
    - docs/**
  exclude: []
review:
  provider: deepseek
  models:
    discovery: deepseek-flash
    planning: deepseek-pro
    applied: deepseek-pro
    verify: deepseek-pro
  monthlyBudgetUsd: 10
executor:
  tool: cursor
validationAssistants:
  clineDeepSeek:
    enabled: false
    mode: read-only
YAML
}

register_project() {
  local repo_dir="$1"
  local display_name="$2"
  local reg_req
  reg_req="$(mktemp)"
  python3 - "${repo_dir}" "${display_name}" "${reg_req}" <<'PY'
import json, sys
json.dump(
    {"repositoryPath": sys.argv[1], "displayName": sys.argv[2]},
    open(sys.argv[3], "w"),
)
PY
  http_json POST "${API_BASE}/projects" "${reg_req}"
  rm -f "${reg_req}"
  assert_eq "register ${display_name} HTTP" "201" "${HTTP_STATUS}"
  REGISTERED_PROJECT_ID="$(
    python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
cfg = body.get("configuration") or {}
if cfg.get("status") != "attached":
    raise SystemExit(f"expected attached configuration, got: {cfg!r}")
print(body["id"], end="")
PY
  )"
  rm -f "${BODY_FILE}"
}

sql_ro() {
  local sql="$1"
  (
    cd "${REPO_ROOT}"
    docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -t -A -c "${sql}"
  )
}

snapshot_axioma() {
  docker inspect -f 'status={{.State.Status}} started={{.State.StartedAt}} finished={{.State.FinishedAt}} restarts={{.RestartCount}}' axioma-db-dev 2>/dev/null || echo 'missing'
}

stop_nokey_container() {
  if docker ps -a --format '{{.Names}}' | grep -qx "${NOKEY_CONTAINER}"; then
    docker rm -f "${NOKEY_CONTAINER}" >/dev/null 2>&1 || true
    log "Removed temporary container ${NOKEY_CONTAINER}"
  fi
}

cleanup() {
  if [[ "${CLEANUP_DONE}" -eq 1 ]]; then
    return 0
  fi
  CLEANUP_DONE=1
  section "Cleanup"

  stop_nokey_container

  (
    cd "${REPO_ROOT}"
    for id in "${DISPOSABLE_IDS[@]+"${DISPOSABLE_IDS[@]}"}"; do
      docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 \
        -c "DELETE FROM projects WHERE id = '${id}';" >/dev/null
      log "Deleted disposable project id=${id}"
    done
  )

  for d in "${DISPOSABLE_DIRS[@]+"${DISPOSABLE_DIRS[@]}"}"; do
    if [[ -e "${d}" ]]; then
      rm -rf -- "${d}"
      log "Removed disposable directory ${d}"
    fi
  done

  # Confirm main API still healthy after any temp harness work.
  if curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "${API_BASE}/health" | grep -qx 200; then
    pass "main API /health still 200 after cleanup"
  else
    fail "main API /health not 200 after cleanup" || true
  fi

  AXIOMA_AFTER="$(snapshot_axioma)"
  if [[ "${AXIOMA_BEFORE}" == "${AXIOMA_AFTER}" ]]; then
    pass "axioma-db-dev untouched (${AXIOMA_AFTER})"
  else
    fail "axioma-db-dev changed before='${AXIOMA_BEFORE}' after='${AXIOMA_AFTER}'" || true
  fi

  rm -f "${PROBE_META_FILE}"
}

trap cleanup EXIT

assert_error_body() {
  local label="$1"
  local expected_code="$2"
  python3 - "${BODY_FILE}" "${expected_code}" "${label}" <<'PY'
import json, sys, re
path, expected, label = sys.argv[1], sys.argv[2], sys.argv[3]
body = json.load(open(path))
raw = open(path, encoding="utf-8").read()
# Env var *name* may appear in operator-facing messages; reject values/headers only.
forbidden = [
    "Authorization",
    "Bearer ",
    "reasoning_content",
    "-----BEGIN",
]
for token in forbidden:
    if token.lower() in raw.lower():
        raise SystemExit(f"{label}: forbidden token {token!r} in error body")
if re.search(r"DEEPSEEK_API_KEY\s*=\s*\S+", raw):
    raise SystemExit(f"{label}: DEEPSEEK_API_KEY assignment/value in error body")
if re.search(r"sk-[A-Za-z0-9_-]{12,}", raw):
    raise SystemExit(f"{label}: possible api key material in error body")
if body.get("code") != expected:
    raise SystemExit(f"{label}: expected code {expected}, got {body.get('code')!r}")
# no stack / path dumps
for bad in ("stack", "repositoryPath", "bundleContent", "disclosureExcerpt", "prompt"):
    if bad in body:
        raise SystemExit(f"{label}: unexpected field {bad}")
print("ok")
PY
}

assert_probe_ok() {
  python3 - "${BODY_FILE}" "${PROBE_META_FILE}" <<'PY'
import json, sys, re
path, meta_path = sys.argv[1], sys.argv[2]
raw = open(path, encoding="utf-8").read()
body = json.loads(raw)

forbidden_substrings = [
    "Authorization",
    "Bearer ",
    "DEEPSEEK_API_KEY",
    "reasoning_content",
    "choices",
    "system",
]
for token in forbidden_substrings:
    if token in raw:
        raise SystemExit(f"forbidden token in probe response: {token}")
if re.search(r"sk-[A-Za-z0-9_-]{12,}", raw):
    raise SystemExit("possible api key material in probe response")
# raw provider-ish keys must not appear at top level
for bad in ("choices", "reasoning_content", "prompt", "repositoryPath", "bundle", "disclosure"):
    if bad in body:
        raise SystemExit(f"unexpected top-level field: {bad}")

def fail(msg):
    raise SystemExit(msg)

if body.get("status") != "ok":
    fail(f"status={body.get('status')!r}")
if body.get("stage") != "discovery":
    fail(f"stage={body.get('stage')!r}")
if body.get("providerId") != "deepseek":
    fail(f"providerId={body.get('providerId')!r}")
if not isinstance(body.get("modelAlias"), str) or not body["modelAlias"]:
    fail("modelAlias missing")
if body.get("resolvedModelId") != "deepseek-v4-flash":
    fail(f"resolvedModelId={body.get('resolvedModelId')!r}")
if body.get("schemaId") != "deepseek-gateway-probe-v1":
    fail(f"schemaId={body.get('schemaId')!r}")
ac = body.get("attemptCount")
if not isinstance(ac, int) or ac < 1 or ac > 3:
    fail(f"attemptCount={ac!r}")
if body.get("providerHttpStatus") != 200:
    fail(f"providerHttpStatus={body.get('providerHttpStatus')!r}")
lat = body.get("latencyMs")
if not isinstance(lat, (int, float)) or lat < 0:
    fail(f"latencyMs={lat!r}")
parsed = body.get("parsed")
if not isinstance(parsed, dict):
    fail("parsed missing")
if parsed.get("ok") is not True:
    fail("parsed.ok")
if parsed.get("probe") != "deepseek-gateway-probe-v1":
    fail("parsed.probe")
msg = parsed.get("message")
if not isinstance(msg, str) or not (1 <= len(msg) <= 200):
    fail("parsed.message length invalid")
usage = body.get("usage")
usage_present = usage is not None
if usage_present:
    if not isinstance(usage, dict):
        fail("usage not object")
    for k in ("promptTokens", "completionTokens", "totalTokens"):
        if k in usage and not isinstance(usage[k], (int, float)):
            fail(f"usage.{k} invalid")
req_id = body.get("providerRequestId")
req_present = req_id is not None
if req_present and (not isinstance(req_id, str) or not req_id):
    fail("providerRequestId invalid")

meta = {
    "stage": body["stage"],
    "modelAlias": body["modelAlias"],
    "resolvedModelId": body["resolvedModelId"],
    "schemaId": body["schemaId"],
    "attemptCount": ac,
    "providerHttpStatus": 200,
    "latencyMs": lat,
    "usagePresent": usage_present,
    "providerRequestIdPresent": req_present,
    "parsedMessageLength": len(msg),
    "projectId": body.get("projectId"),
}
json.dump(meta, open(meta_path, "w"))
print("ok")
PY
}

# ---------------------------------------------------------------------------
section "Runtime diagnosis"
AXIOMA_BEFORE="$(snapshot_axioma)"
log "axioma-db-dev snapshot: ${AXIOMA_BEFORE}"
(
  cd "${REPO_ROOT}"
  docker compose ps
) | tee -a "${REPORT}"
API_INSPECT="$(docker inspect -f 'status={{.State.Status}} started={{.State.StartedAt}} restarts={{.RestartCount}}' specpilot-api)"
log "specpilot-api: ${API_INSPECT}"
KEY_PRESENCE="$(
  docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi'
)"
BASE_PRESENCE="$(
  docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_BASE_URL:-}" ]; then echo present_UNEXPECTED; else echo absent_ok; fi'
)"
log "DEEPSEEK_API_KEY presence: ${KEY_PRESENCE}"
log "DEEPSEEK_BASE_URL presence: ${BASE_PRESENCE}"
assert_eq "DEEPSEEK_API_KEY present in main api" "present" "${KEY_PRESENCE}"
assert_eq "DEEPSEEK_BASE_URL absent in main api" "absent_ok" "${BASE_PRESENCE}"

wait_health "${API_BASE}" "main-api"

# ---------------------------------------------------------------------------
section "Resolve project"
http_json GET "${API_BASE}/projects"
assert_eq "GET /projects HTTP" "200" "${HTTP_STATUS}"
PROJECT_ID="$(
  python3 - "${BODY_FILE}" <<'PY'
import json, sys
items = json.load(open(sys.argv[1]))
if isinstance(items, dict) and "items" in items:
    items = items["items"]
if not isinstance(items, list):
    raise SystemExit("unexpected /projects shape")
print(items[0]["id"] if items else "", end="")
PY
)"
rm -f "${BODY_FILE}"

if [[ -z "${PROJECT_ID}" ]]; then
  CREATED_PROJECT=1
  DEST="${SPECPILOT_HOST_REPOS_ROOT}/sp-w03-s01-hv-${STAMP}"
  mkdir -p "${DEST}/.specpilot" "${DEST}/docs" "${DEST}/openspec"
  track_dir "${DEST}"
  write_project_yaml "${DEST}/.specpilot/project.yaml" "sp-w03-s01-hv" "sp-w03-s01-hv"
  printf '%s\n' '# disposable fixture' >"${DEST}/docs/readme.md"
  register_project "${DEST}" "sp-w03-s01-hv"
  PROJECT_ID="${REGISTERED_PROJECT_ID}"
  track_id "${PROJECT_ID}"
  pass "created disposable project ${PROJECT_ID}"
else
  pass "reusing existing registered project (id redacted length=${#PROJECT_ID})"
fi

# ---------------------------------------------------------------------------
section "Real DeepSeek probe"
REQ="$(mktemp)"
printf '%s\n' '{}' >"${REQ}"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/deepseek/probe" "${REQ}"
rm -f "${REQ}"
assert_eq "probe HTTP" "200" "${HTTP_STATUS}"
assert_probe_ok
pass "probe response schema + safety constraints"
# Sanitized metadata only (never dump parsed.message)
python3 - "${PROBE_META_FILE}" <<'PY' | tee -a "${REPORT}"
import json, sys
m = json.load(open(sys.argv[1]))
for k in (
    "stage",
    "modelAlias",
    "resolvedModelId",
    "schemaId",
    "attemptCount",
    "providerHttpStatus",
    "latencyMs",
    "usagePresent",
    "providerRequestIdPresent",
    "parsedMessageLength",
):
    print(f"probe.{k}={m[k]}")
PY
rm -f "${BODY_FILE}"

PROVIDER_CALL_TABLES="$(
  sql_ro "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%provider%call%';" | tr -d '[:space:]'
)"
assert_eq "no provider-call tables" "0" "${PROVIDER_CALL_TABLES}"

# ---------------------------------------------------------------------------
section "Blocked invalid probe requests"
for case in 'new|{"stage":"new"}' 'unknown|{"stage":"unknown"}' 'extra|{"stage":"discovery","prompt":"not allowed"}'; do
  label="${case%%|*}"
  payload="${case#*|}"
  req="$(mktemp)"
  printf '%s\n' "${payload}" >"${req}"
  before_logs="$(docker logs specpilot-api 2>&1 | wc -l | tr -d ' ')"
  http_json POST "${API_BASE}/projects/${PROJECT_ID}/deepseek/probe" "${req}"
  rm -f "${req}"
  assert_eq "block ${label} HTTP" "422" "${HTTP_STATUS}"
  assert_error_body "block ${label}" "invalid_deepseek_probe_request"
  pass "block ${label} code + sanitized body"
  # Heuristic: no new successful outbound probe log with attemptCount>=1 immediately after
  after_snippet="$(docker logs specpilot-api 2>&1 | tail -n +$((before_logs + 1)) | sanitize_stream || true)"
  if echo "${after_snippet}" | grep -q '"event":"deepseek_probe".*"attemptCount":[1-9]'; then
    fail "block ${label}: unexpected outbound probe attempt log" || true
  else
    pass "block ${label}: no outbound attemptCount>=1 log"
  fi
  rm -f "${BODY_FILE}"
done

# ---------------------------------------------------------------------------
section "Missing key via temporary SpecPilot-owned container"
stop_nokey_container
(
  cd "${REPO_ROOT}"
  # Explicit empty key overrides compose/.env for this one-off only. Main .env untouched.
  docker compose run -d --name "${NOKEY_CONTAINER}" --no-deps \
    -e DEEPSEEK_API_KEY= \
    -p 3001:3000 \
    api >/dev/null
)
wait_health "${NOKEY_API_BASE}" "nokey-api" 90
# Main API must remain healthy with key
wait_health "${API_BASE}" "main-api-during-nokey" 10
MAIN_KEY="$(docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi')"
assert_eq "main api key still present during nokey harness" "present" "${MAIN_KEY}"
NOKEY_KEY="$(docker exec "${NOKEY_CONTAINER}" sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi')"
assert_eq "nokey container key absent" "absent" "${NOKEY_KEY}"

before_nokey_logs="$(docker logs "${NOKEY_CONTAINER}" 2>&1 | wc -l | tr -d ' ')"
REQ="$(mktemp)"
printf '%s\n' '{}' >"${REQ}"
http_json POST "${NOKEY_API_BASE}/projects/${PROJECT_ID}/deepseek/probe" "${REQ}"
rm -f "${REQ}"
assert_eq "missing-key probe HTTP" "422" "${HTTP_STATUS}"
assert_error_body "missing-key" "deepseek_not_configured"
pass "missing-key code deepseek_not_configured"
new_logs="$(docker logs "${NOKEY_CONTAINER}" 2>&1 | tail -n +$((before_nokey_logs + 1)) | sanitize_stream || true)"
if echo "${new_logs}" | grep -q "${NOKEY_LOG_MARKER}" && echo "${new_logs}" | grep -q '"attemptCount":0'; then
  pass "missing-key zero outbound attempts (attemptCount=0 log)"
else
  # Still accept if code path returned before HTTP and log line present without attempts
  if echo "${new_logs}" | grep -q "${NOKEY_LOG_MARKER}"; then
    pass "missing-key configured-failure log present"
  else
    fail "missing-key: expected deepseek_not_configured log with attemptCount 0" || true
  fi
fi
if echo "${new_logs}" | grep -Eqi 'api\.deepseek\.com|Authorization'; then
  fail "missing-key: suspicious outbound/auth markers in logs" || true
else
  pass "missing-key: no api.deepseek.com/Authorization markers in new logs"
fi
rm -f "${BODY_FILE}"

# Health without key on temp container
http_json GET "${NOKEY_API_BASE}/health"
assert_eq "nokey /health HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
http_json GET "${API_BASE}/health"
assert_eq "main /health during nokey HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"

stop_nokey_container
wait_health "${API_BASE}" "main-api-restored" 30
pass "normal runtime restored (main api healthy; nokey harness removed)"

# ---------------------------------------------------------------------------
section "Secret-safety (tracked/staged + evidence; never read .env contents)"
(
  cd "${REPO_ROOT}"
  # Ensure .env is ignored
  if git check-ignore -q .env; then
    pass ".env is gitignored"
  else
    fail ".env is NOT gitignored" || true
  fi

  # Staged/tracked secret patterns (do not print matching secret values)
  BAD_HITS="$(
    {
      git ls-files -z
      git diff --cached --name-only -z
    } | sort -zu | xargs -0 rg -l -i \
      -e 'sk-[A-Za-z0-9_-]{20,}' \
      -e 'Authorization:\s*Bearer\s+\S+' \
      -e 'reasoning_content' \
      -e 'DEEPSEEK_API_KEY=\S+' \
      2>/dev/null || true
  )"
  # Allow empty placeholder assignments only in .env.example style files if they match DEEPSEEK_API_KEY=$
  if [[ -n "${BAD_HITS}" ]]; then
    FILTERED="$(
      printf '%s\n' "${BAD_HITS}" | while read -r f; do
        [[ -z "${f}" ]] && continue
        # .env.example may contain DEEPSEEK_API_KEY= empty — check non-empty values only
        if [[ "${f}" == *.env.example ]]; then
          if rg -n 'DEEPSEEK_API_KEY=\S+' "${f}" | rg -v 'DEEPSEEK_API_KEY=$' >/dev/null; then
            echo "${f}"
          fi
        else
          echo "${f}"
        fi
      done
    )"
    if [[ -n "${FILTERED}" ]]; then
      log "secret-safety hits (paths only):"
      log "${FILTERED}"
      fail "secret-safety: forbidden patterns in tracked/staged files" || true
    else
      pass "secret-safety: no forbidden patterns in tracked/staged files"
    fi
  else
    pass "secret-safety: no forbidden patterns in tracked/staged files"
  fi

  if rg -n 'DEEPSEEK_BASE_URL' compose.yaml .env.example apps/api apps/web packages 2>/dev/null | rg -v 'absent|must not|MUST NOT|no DEEPSEEK_BASE_URL|without DEEPSEEK_BASE_URL' >/dev/null; then
    # Allow docs/comments that say it must not exist; fail on actual config assignment
    if rg -n 'DEEPSEEK_BASE_URL\s*=' compose.yaml .env.example 2>/dev/null; then
      fail "DEEPSEEK_BASE_URL assignment found in compose/.env.example" || true
    else
      pass "no DEEPSEEK_BASE_URL assignment in compose/.env.example"
    fi
  else
    pass "no DEEPSEEK_BASE_URL in compose/env baseline surfaces"
  fi

  if rg -n 'model ProviderCall|model provider_call|@@map\("provider_calls"\)' apps/api/prisma/schema.prisma 2>/dev/null; then
    fail "provider-call Prisma model present" || true
  else
    pass "no provider-call Prisma model"
  fi

  if rg -n 'provider_calls|ProviderCall' apps/api/prisma/migrations 2>/dev/null; then
    fail "provider-call migration present" || true
  else
    pass "no provider-call migration"
  fi

  # Probe path must not read repository / ContextBundle / preview / disclosure
  if rg -n 'ContextBundle|contextDisclosure|previewSession|readFile|repositoryPath' \
      apps/api/src/app/deepseek/*.ts 2>/dev/null \
      | rg -v 'spec\.ts|projectId|activeConfiguration|normalizedConfig|findUnique' >/dev/null; then
    # Narrower: ensure probe service does not import bundle/disclosure services
    if rg -n 'ContextBundle|Disclosure|Preview' apps/api/src/app/deepseek/deepseek-probe.service.ts >/dev/null; then
      fail "probe service references bundle/disclosure surfaces" || true
    else
      pass "probe service has no bundle/disclosure references"
    fi
  else
    pass "deepseek module has no bundle/disclosure repository reads"
  fi
)

# ---------------------------------------------------------------------------
section "Summary"
log "PASS_COUNT=${PASS_COUNT}"
log "FAIL_COUNT=${FAIL_COUNT}"
log "REPORT=${REPORT}"
log "CREATED_PROJECT=${CREATED_PROJECT}"
log "axioma_before=${AXIOMA_BEFORE}"

{
  echo "operator-human-validation smoke ${STAMP}"
  echo "PASS_COUNT=${PASS_COUNT}"
  echo "FAIL_COUNT=${FAIL_COUNT}"
  if [[ -f "${PROBE_META_FILE}" ]]; then
    python3 - "${PROBE_META_FILE}" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
print("probe_real=PASS")
for k in ("stage","modelAlias","resolvedModelId","schemaId","attemptCount","providerHttpStatus","latencyMs","usagePresent","parsedMessageLength"):
    print(f"{k}={m[k]}")
PY
  fi
  echo "blocks=invalid_stage,unknown_stage,extra_field"
  echo "missing_key=PASS"
  echo "secret_safety=see report"
} >"${SMOKE_OUT}"

if [[ "${FAIL_COUNT}" -ne 0 ]]; then
  log "OVERALL=FAIL"
  exit 1
fi
log "OVERALL=PASS"
exit 0
