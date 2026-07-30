#!/usr/bin/env bash
# Operator human-validation for chg-w03-s02-review-run-orchestration.
# Never prints DEEPSEEK_API_KEY values, Authorization, excerpts, prompts, or raw
# provider bodies. SpecPilot-owned resources only. No axioma-db-dev / volume reset.
# Does not Verify/sync/archive/commit/push.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
NOKEY_API_BASE="${NOKEY_API_BASE:-http://localhost:3001}"
BADKEY_API_BASE="${BADKEY_API_BASE:-http://localhost:3002}"
NOKEY_CONTAINER="${NOKEY_CONTAINER:-specpilot-api-nokey-hv}"
BADKEY_CONTAINER="${BADKEY_CONTAINER:-specpilot-api-badkey-hv}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
STAMP="$(date +%Y%m%dT%H%M%S)"
EVID_DIR="${REPO_ROOT}/openspec/changes/chg-w03-s02-review-run-orchestration/evidence"
REPORT="${REPORT_PATH:-/tmp/sp-w03-s02-operator-validation-${STAMP}.txt}"
SMOKE_OUT="${SMOKE_OUT:-${EVID_DIR}/success/operator-human-validation-smoke.txt}"
REPORT_OUT="${REPORT_OUT:-${EVID_DIR}/success/operator-human-validation-report.txt}"
META_DIR="$(mktemp -d)"

if [[ -z "${SPECPILOT_HOST_REPOS_ROOT:-}" && -f "${REPO_ROOT}/.env" ]]; then
  SPECPILOT_HOST_REPOS_ROOT="$(
    grep -E '^SPECPILOT_HOST_REPOS_ROOT=' "${REPO_ROOT}/.env" | head -1 | cut -d= -f2-
  )"
  export SPECPILOT_HOST_REPOS_ROOT
fi
if [[ -z "${SPECPILOT_HOST_REPOS_ROOT:-}" || ! -d "${SPECPILOT_HOST_REPOS_ROOT}" ]]; then
  echo "ERROR: SPECPILOT_HOST_REPOS_ROOT must be set to an existing directory." >&2
  exit 1
fi

DISPOSABLE_IDS=()
DISPOSABLE_DIRS=()
CLEANUP_DONE=0
PASS_COUNT=0
FAIL_COUNT=0
AXIOMA_BEFORE=""
AXIOMA_AFTER=""
SUCCESS_RUN_ID=""
PROJECT_ID=""
BUNDLE_OK_ID=""
APPROVAL_ID=""
CFG_ID=""

log() { printf '%s\n' "$*" | tee -a "${REPORT}"; }
section() { log ""; log "=== $* ==="; }
pass() { PASS_COUNT=$((PASS_COUNT + 1)); log "PASS: $*"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); log "FAIL: $*"; return 1; }
assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${expected}" == "${actual}" ]]; then pass "${label} == ${expected}"
  else fail "${label}: expected '${expected}', got '${actual}'"; fi
}

sanitize_stream() {
  sed -E \
    -e 's/(DEEPSEEK_API_KEY|Authorization|Bearer)[=:][^[:space:]]*/\1=<redacted>/gi' \
    -e 's/sk-[A-Za-z0-9_-]{8,}/<redacted-key>/g'
}

http_json() {
  local method="$1" url="$2" data_file="${3:-}"
  BODY_FILE="$(mktemp)"
  local args=(-sS -X "${method}" -o "${BODY_FILE}" -w '%{http_code}' --max-time 180 "${url}")
  if [[ -n "${data_file}" ]]; then
    args+=(-H 'content-type: application/json' --data-binary @"${data_file}")
  fi
  HTTP_STATUS="$(curl "${args[@]}")"
}

wait_health() {
  local base="$1" label="$2" attempts="${3:-90}" i code
  section "Wait health (${label}) ${base}/health"
  for i in $(seq 1 "${attempts}"); do
    code="$(curl -sS -o /tmp/sp-hv-health.json -w '%{http_code}' --max-time 3 "${base}/health" 2>/dev/null || true)"
    if [[ "${code}" == "200" ]]; then
      pass "${label} GET /health == 200 (attempt ${i})"
      return 0
    fi
    sleep 1
  done
  fail "${label} GET /health did not become 200 (last=${code:-err})"
}

track_id() { DISPOSABLE_IDS+=("$1"); }
track_dir() { DISPOSABLE_DIRS+=("$1"); }

sql_ro() {
  ( cd "${REPO_ROOT}" && docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -t -A -c "$1" )
}

snapshot_axioma() {
  docker inspect -f 'status={{.State.Status}} started={{.State.StartedAt}} finished={{.State.FinishedAt}} restarts={{.RestartCount}}' axioma-db-dev 2>/dev/null || echo 'missing'
}

stop_temp_container() {
  local name="$1"
  if docker ps -a --format '{{.Names}}' | grep -qx "${name}"; then
    docker rm -f "${name}" >/dev/null 2>&1 || true
    log "Removed temporary container ${name}"
  fi
}

write_project_yaml() {
  local dest="$1" project_id="$2" project_name="$3"
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
  local repo_dir="$1" display_name="$2" reg_req
  reg_req="$(mktemp)"
  python3 - "${repo_dir}" "${display_name}" "${reg_req}" <<'PY'
import json, sys
json.dump({"repositoryPath": sys.argv[1], "displayName": sys.argv[2]}, open(sys.argv[3], "w"))
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
  CFG_ID="$(
    python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
print(body["configuration"]["version"]["id"], end="")
PY
  )"
  rm -f "${BODY_FILE}"
}

assert_safe_json_file() {
  local path="$1" label="$2"
  python3 - "${path}" "${label}" <<'PY'
import json, sys, re
path, label = sys.argv[1], sys.argv[2]
raw = open(path, encoding="utf-8").read()
body = json.loads(raw)
forbidden = ["Authorization", "Bearer ", "reasoning_content", "-----BEGIN", "excerpt", "promptText", "rawResponse", "choices"]
for token in forbidden:
    if token.lower() in raw.lower() and token.lower() not in ("excerpt",):
        # allow field *names* that are only code tokens; reject payload markers
        pass
for token in ("Authorization", "Bearer ", "reasoning_content", "-----BEGIN"):
    if token.lower() in raw.lower():
        raise SystemExit(f"{label}: forbidden token {token!r}")
if re.search(r"DEEPSEEK_API_KEY\s*=\s*\S+", raw):
    raise SystemExit(f"{label}: key assignment in body")
if re.search(r"sk-[A-Za-z0-9_-]{12,}", raw):
    raise SystemExit(f"{label}: possible api key material")
# Never allow excerpt field values in review-run DTOs
if isinstance(body, dict):
    stack = [body]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            if "excerpt" in cur or "prompt" in cur or "rawResponse" in cur:
                raise SystemExit(f"{label}: forbidden content field present")
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)
print("ok")
PY
}

cleanup() {
  if [[ "${CLEANUP_DONE}" -eq 1 ]]; then return 0; fi
  CLEANUP_DONE=1
  section "Cleanup"
  stop_temp_container "${NOKEY_CONTAINER}"
  stop_temp_container "${BADKEY_CONTAINER}"
  (
    cd "${REPO_ROOT}"
    for id in "${DISPOSABLE_IDS[@]+"${DISPOSABLE_IDS[@]}"}"; do
      docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 \
        -c "DELETE FROM projects WHERE id = '${id}';" >/dev/null
      log "Deleted disposable project id=${id}"
    done
  )
  for d in "${DISPOSABLE_DIRS[@]+"${DISPOSABLE_DIRS[@]}"}"; do
    if [[ -e "${d}" ]]; then rm -rf -- "${d}"; log "Removed disposable directory ${d}"; fi
  done
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
  rm -rf "${META_DIR}"
  # Copy sanitized report into evidence (never include secrets)
  mkdir -p "$(dirname "${REPORT_OUT}")" "$(dirname "${SMOKE_OUT}")"
  sanitize_stream <"${REPORT}" >"${REPORT_OUT}"
  {
    echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "pass_count=${PASS_COUNT}"
    echo "fail_count=${FAIL_COUNT}"
    if [[ "${FAIL_COUNT}" -eq 0 ]]; then echo "HUMAN_VALIDATION_SMOKE=PASS"; else echo "HUMAN_VALIDATION_SMOKE=FAIL"; fi
  } >"${SMOKE_OUT}"
}

trap cleanup EXIT

# ---------------------------------------------------------------------------
section "Runtime diagnosis"
AXIOMA_BEFORE="$(snapshot_axioma)"
log "axioma-db-dev snapshot: ${AXIOMA_BEFORE}"
( cd "${REPO_ROOT}" && docker compose ps ) | tee -a "${REPORT}"
KEY_PRESENCE="$(docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi')"
log "DEEPSEEK_API_KEY presence (main api): ${KEY_PRESENCE}"
assert_eq "DEEPSEEK_API_KEY present in main api" "present" "${KEY_PRESENCE}"
wait_health "${API_BASE}" "main-api"

# Freshness: review-runs route must exist
http_json POST "${API_BASE}/projects/00000000-0000-0000-0000-000000000000/review-runs" <(printf '%s\n' '{"stage":"new","contextBundleId":"x"}')
if [[ "${HTTP_STATUS}" == "404" ]]; then
  BODY_SNIP="$(python3 - "${BODY_FILE}" <<'PY'
import json,sys
try:
  b=json.load(open(sys.argv[1])); print(b.get("code") or b.get("message") or "")
except Exception as e:
  print(type(e).__name__)
PY
)"
  if [[ "${BODY_SNIP}" == *"Cannot POST"* ]]; then
    fail "review-runs route missing — rebuild api before HV"
  else
    pass "review-runs route live (project_not_found path)"
  fi
else
  pass "review-runs route live (HTTP ${HTTP_STATUS})"
fi
rm -f "${BODY_FILE}"

MIG="$(sql_ro "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='20260729200000_add_review_run_orchestration';" | tr -d '[:space:]')"
assert_eq "migration 20260729200000 applied" "1" "${MIG}"
TBL_RR="$(sql_ro "SELECT to_regclass('public.review_runs') IS NOT NULL;" | tr -d '[:space:]')"
TBL_TR="$(sql_ro "SELECT to_regclass('public.review_run_transitions') IS NOT NULL;" | tr -d '[:space:]')"
TBL_TX="$(sql_ro "SELECT to_regclass('public.context_disclosure_transmissions') IS NOT NULL;" | tr -d '[:space:]')"
assert_eq "table review_runs" "t" "${TBL_RR}"
assert_eq "table review_run_transitions" "t" "${TBL_TR}"
assert_eq "table context_disclosure_transmissions" "t" "${TBL_TX}"
IDX="$(sql_ro "SELECT COUNT(*) FROM pg_indexes WHERE indexname='review_runs_one_inflight_per_project';" | tr -d '[:space:]')"
assert_eq "partial unique index present" "1" "${IDX}"
NO_TX_COL="$(sql_ro "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='review_runs' AND column_name='transmission_id';" | tr -d '[:space:]')"
assert_eq "no ReviewRun.transmission_id scalar" "0" "${NO_TX_COL}"
FORBIDDEN_TABLES="$(sql_ro "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('budgets','budget_reservations','findings','prompt_history','users','auth_sessions');" | tr -d '[:space:]')"
assert_eq "no budget/findings/prompt/auth/user tables" "0" "${FORBIDDEN_TABLES}"

# ---------------------------------------------------------------------------
section "Disposable project + Wave2 prerequisites"
DEST="${SPECPILOT_HOST_REPOS_ROOT}/sp-w03-s02-hv-${STAMP}"
mkdir -p "${DEST}/.specpilot" "${DEST}/docs" "${DEST}/openspec"
track_dir "${DEST}"
write_project_yaml "${DEST}/.specpilot/project.yaml" "sp-w03-s02-hv" "sp-w03-s02-hv"
printf '%s\n' 'line-one ordinary text' 'line-two ordinary text' 'line-three ordinary text' >"${DEST}/docs/multi.md"
register_project "${DEST}" "sp-w03-s02-hv"
PROJECT_ID="${REGISTERED_PROJECT_ID}"
track_id "${PROJECT_ID}"
pass "created disposable project (id length=${#PROJECT_ID})"

# Resolve → secret-scan → bundle (stage new)
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-sources/resolve" <(printf '%s\n' '{"stage":"new"}')
assert_eq "resolve HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-sources/secret-scan" <(printf '%s\n' '{"stage":"new"}')
assert_eq "secret-scan HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-bundles" <(printf '%s\n' '{"stage":"new"}')
assert_eq "bundle HTTP" "201" "${HTTP_STATUS}"
BUNDLE_OK_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "${BODY_FILE}")"
MANIFEST_HASH="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["manifestHash"])' "${BODY_FILE}")"
rm -f "${BODY_FILE}"
pass "bundle created id_len=${#BUNDLE_OK_ID} hash_len=${#MANIFEST_HASH}"

# Second bundle for blocked-without-approval path
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-bundles" <(printf '%s\n' '{"stage":"new"}')
assert_eq "bundle2 HTTP" "201" "${HTTP_STATUS}"
BUNDLE_NO_APPR_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "${BODY_FILE}")"
rm -f "${BODY_FILE}"

# Preview + approve covering disclosure for BUNDLE_OK_ID
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-bundles/${BUNDLE_OK_ID}/preview" <(printf '%s\n' '{}')
assert_eq "preview HTTP" "200" "${HTTP_STATUS}"
# Preview DTO may include excerpts transiently; never persist them into evidence.
PREVIEW_SESSION_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["previewSessionId"])' "${BODY_FILE}")"
PREVIEW_HASH="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["previewIntegrityHash"])' "${BODY_FILE}")"
# Drop any excerpt payload from memory: rewrite meta only
python3 - "${BODY_FILE}" "${META_DIR}/preview.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
json.dump({
  "previewSessionId": b["previewSessionId"],
  "previewIntegrityHash": b["previewIntegrityHash"],
  "manifestHash": b["manifestHash"],
  "itemCount": b.get("itemCount"),
}, open(sys.argv[2],"w"))
PY
rm -f "${BODY_FILE}"
pass "preview session id_len=${#PREVIEW_SESSION_ID}"

APPR_REQ="$(mktemp)"
python3 - "${PREVIEW_SESSION_ID}" "${MANIFEST_HASH}" "${APPR_REQ}" <<'PY'
import json,sys
json.dump({"previewSessionId":sys.argv[1],"manifestHash":sys.argv[2],"decision":"approved"}, open(sys.argv[3],"w"))
PY
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-bundles/${BUNDLE_OK_ID}/disclosure-approvals" "${APPR_REQ}"
rm -f "${APPR_REQ}"
assert_eq "approval HTTP" "201" "${HTTP_STATUS}"
APPROVAL_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "${BODY_FILE}")"
CT_BEFORE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("contentTransmitted"))' "${BODY_FILE}")"
assert_eq "approval contentTransmitted false" "False" "${CT_BEFORE}"
rm -f "${BODY_FILE}"
pass "disclosure approval id_len=${#APPROVAL_ID}"

WAVE2_BUNDLE_FP="$(sql_ro "SELECT manifest_hash FROM context_bundles WHERE id='${BUNDLE_OK_ID}';" | tr -d '[:space:]')"
WAVE2_APPR_CT="$(sql_ro "SELECT content_transmitted::text FROM context_disclosure_approvals WHERE id='${APPROVAL_ID}';" | tr -d '[:space:]')"
assert_eq "approval content_transmitted DB false" "false" "${WAVE2_APPR_CT}"

# ---------------------------------------------------------------------------
section "A. Successful review-run (real DeepSeek)"
TX_BEFORE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_OK_ID}\"}")
assert_eq "success create HTTP" "201" "${HTTP_STATUS}"
assert_safe_json_file "${BODY_FILE}" "success-run"
python3 - "${BODY_FILE}" "${META_DIR}/success.json" <<'PY'
import json, sys
path, out = sys.argv[1], sys.argv[2]
b = json.load(open(path))
def fail(m): raise SystemExit(m)
if b.get("status") != "ok": fail("status")
if b.get("state") != "completed": fail(f"state={b.get('state')}")
if b.get("budgetCheckStatus") != "not_enforced": fail("budget")
if b.get("schemaId") != "review-run-orchestration-v1": fail("schemaId")
if b.get("promptTemplateId") != "review-run-orchestration-v1": fail("promptTemplateId")
if b.get("stage") != "new": fail("stage")
verdict = b.get("verdict")
if verdict not in ("ready_to_create", "blocked", "changes_required"): fail(f"verdict={verdict}")
rat = b.get("rationale") or ""
if not isinstance(rat, str) or not (1 <= len(rat) <= 500): fail("rationale length")
ac = b.get("attemptCount")
if not isinstance(ac, int) or ac < 1: fail(f"attemptCount={ac}")
tr = b.get("transitions") or []
seq = [(t.get("fromState"), t.get("toState")) for t in tr]
expected = [
  (None, "requested"),
  ("requested", "preparing_context"),
  ("preparing_context", "budget_check"),
  ("budget_check", "running"),
  ("running", "validating_response"),
  ("validating_response", "completed"),
]
if seq != expected: fail(f"transitions={seq}")
tx = b.get("transmission")
if not isinstance(tx, dict): fail("transmission missing")
if tx.get("outcome") != "completed": fail("tx outcome")
if b.get("hasTransmission") is not True: fail("hasTransmission")
meta = {
  "id": b["id"],
  "projectId": b["projectId"],
  "stage": b["stage"],
  "state": b["state"],
  "contextBundleId": b.get("contextBundleId"),
  "manifestHash": b.get("manifestHash"),
  "disclosureApprovalId": b.get("disclosureApprovalId"),
  "budgetCheckStatus": b.get("budgetCheckStatus"),
  "modelAlias": b.get("modelAlias"),
  "resolvedModelId": b.get("resolvedModelId"),
  "schemaId": b.get("schemaId"),
  "promptTemplateId": b.get("promptTemplateId"),
  "verdict": verdict,
  "rationaleLength": len(rat),
  "attemptCount": ac,
  "latencyMs": b.get("latencyMs"),
  "usagePresent": b.get("totalTokens") is not None,
  "transmissionOutcome": tx.get("outcome"),
  "transitionCount": len(tr),
}
json.dump(meta, open(out, "w"), indent=2)
print("ok")
PY
SUCCESS_RUN_ID="$(python3 -c 'import json; print(json.load(open("'"${META_DIR}/success.json"'"))["id"])')"
pass "successful run completed id_len=${#SUCCESS_RUN_ID}"
python3 - "${META_DIR}/success.json" <<'PY' | tee -a "${REPORT}"
import json,sys
m=json.load(open(sys.argv[1]))
for k in sorted(m):
  if k in ("id","projectId","contextBundleId","disclosureApprovalId","manifestHash"):
    print(f"success.{k}_len={len(str(m[k] or ''))}")
  else:
    print(f"success.{k}={m[k]}")
PY
rm -f "${BODY_FILE}"

TX_AFTER="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
assert_eq "exactly one transmission delta" "1" "$((TX_AFTER - TX_BEFORE))"
TX_UNIQUE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE review_run_id='${SUCCESS_RUN_ID}';" | tr -d '[:space:]')"
assert_eq "unique transmission per success run" "1" "${TX_UNIQUE}"
TX_OUTCOME="$(sql_ro "SELECT outcome FROM context_disclosure_transmissions WHERE review_run_id='${SUCCESS_RUN_ID}';" | tr -d '[:space:]')"
assert_eq "transmission outcome completed" "completed" "${TX_OUTCOME}"

# GET + list
http_json GET "${API_BASE}/projects/${PROJECT_ID}/review-runs/${SUCCESS_RUN_ID}"
assert_eq "GET run HTTP" "200" "${HTTP_STATUS}"
assert_safe_json_file "${BODY_FILE}" "get-run"
python3 - "${BODY_FILE}" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
tr=b["transitions"]
assert [ (t["fromState"], t["toState"]) for t in tr ] == [
  (None,"requested"),("requested","preparing_context"),("preparing_context","budget_check"),
  ("budget_check","running"),("running","validating_response"),("validating_response","completed")
]
# ordered createdAt ASC
times=[t["createdAt"] for t in tr]
assert times==sorted(times)
print("ok")
PY
pass "GET transitions ordered + complete sequence"
rm -f "${BODY_FILE}"

http_json GET "${API_BASE}/projects/${PROJECT_ID}/review-runs?limit=20"
assert_eq "LIST HTTP" "200" "${HTTP_STATUS}"
assert_safe_json_file "${BODY_FILE}" "list-runs"
python3 - "${BODY_FILE}" "${SUCCESS_RUN_ID}" <<'PY'
import json,sys
items=json.load(open(sys.argv[1]))
rid=sys.argv[2]
assert isinstance(items, list)
assert any(i.get("id")==rid for i in items)
for i in items:
  assert "transitions" not in i or i.get("transitions") is None
  assert "transmission" not in i or i.get("transmission") is None
  assert "excerpt" not in i
print("ok")
PY
pass "list returns array without excerpts/full transmission"
rm -f "${BODY_FILE}"

# Wave2 immutability after success
WAVE2_BUNDLE_FP2="$(sql_ro "SELECT manifest_hash FROM context_bundles WHERE id='${BUNDLE_OK_ID}';" | tr -d '[:space:]')"
WAVE2_APPR_CT2="$(sql_ro "SELECT content_transmitted::text FROM context_disclosure_approvals WHERE id='${APPROVAL_ID}';" | tr -d '[:space:]')"
assert_eq "bundle manifest_hash unchanged" "${WAVE2_BUNDLE_FP}" "${WAVE2_BUNDLE_FP2}"
assert_eq "approval content_transmitted still false" "false" "${WAVE2_APPR_CT2}"
pass "Wave 2 immutability after successful transmission"

# ---------------------------------------------------------------------------
section "B. Blocked path (approval required) before provider"
TX_B0="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_NO_APPR_ID}\"}")
# Note: second bundle may share material fingerprint with first if identical content —
# covering approval lookup is by material identity, so identical bundle may be covered.
# Force a distinct unapproved path via integrity mismatch project if needed.
BLOCK_CODE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("blockedCode") or "")' "${BODY_FILE}" 2>/dev/null || true)"
BLOCK_STATE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("state") or "")' "${BODY_FILE}" 2>/dev/null || true)"
if [[ "${HTTP_STATUS}" == "201" && "${BLOCK_STATE}" == "blocked" && "${BLOCK_CODE}" == "review_disclosure_approval_required" ]]; then
  pass "blocked approval_required via second bundle"
elif [[ "${HTTP_STATUS}" == "201" && "${BLOCK_STATE}" == "completed" ]]; then
  log "NOTE: second identical bundle covered by material approval; using integrity-mismatch blocked path"
  rm -f "${BODY_FILE}"
  # Integrity mismatch: mutate file after approval, keep same bundle row hashes → mismatch on reconstruct
  MUT_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w03-s02-hv-mut-${STAMP}"
  mkdir -p "${MUT_DIR}/.specpilot" "${MUT_DIR}/docs" "${MUT_DIR}/openspec"
  track_dir "${MUT_DIR}"
  write_project_yaml "${MUT_DIR}/.specpilot/project.yaml" "sp-w03-s02-hv-mut" "sp-w03-s02-hv-mut"
  printf '%s\n' 'alpha ordinary' 'bravo ordinary' >"${MUT_DIR}/docs/a.md"
  register_project "${MUT_DIR}" "sp-w03-s02-hv-mut"
  MUT_PID="${REGISTERED_PROJECT_ID}"
  track_id "${MUT_PID}"
  http_json POST "${API_BASE}/projects/${MUT_PID}/context-sources/resolve" <(printf '%s\n' '{"stage":"new"}')
  assert_eq "mut resolve HTTP" "200" "${HTTP_STATUS}"; rm -f "${BODY_FILE}"
  http_json POST "${API_BASE}/projects/${MUT_PID}/context-sources/secret-scan" <(printf '%s\n' '{"stage":"new"}')
  assert_eq "mut scan HTTP" "200" "${HTTP_STATUS}"; rm -f "${BODY_FILE}"
  http_json POST "${API_BASE}/projects/${MUT_PID}/context-bundles" <(printf '%s\n' '{"stage":"new"}')
  assert_eq "mut bundle HTTP" "201" "${HTTP_STATUS}"
  MUT_BID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "${BODY_FILE}")"
  MUT_MH="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["manifestHash"])' "${BODY_FILE}")"
  rm -f "${BODY_FILE}"
  http_json POST "${API_BASE}/projects/${MUT_PID}/context-bundles/${MUT_BID}/preview" <(printf '%s\n' '{}')
  assert_eq "mut preview HTTP" "200" "${HTTP_STATUS}"
  MUT_SID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["previewSessionId"])' "${BODY_FILE}")"
  rm -f "${BODY_FILE}"
  APPR_REQ="$(mktemp)"
  python3 - "${MUT_SID}" "${MUT_MH}" "${APPR_REQ}" <<'PY'
import json,sys
json.dump({"previewSessionId":sys.argv[1],"manifestHash":sys.argv[2],"decision":"approved"}, open(sys.argv[3],"w"))
PY
  http_json POST "${API_BASE}/projects/${MUT_PID}/context-bundles/${MUT_BID}/disclosure-approvals" "${APPR_REQ}"
  rm -f "${APPR_REQ}"
  assert_eq "mut approval HTTP" "201" "${HTTP_STATUS}"
  MUT_AID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["id"])' "${BODY_FILE}")"
  rm -f "${BODY_FILE}"
  printf '%s\n' 'MUTATED after approval — integrity must fail' >"${MUT_DIR}/docs/a.md"
  TX_B0="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${MUT_PID}';" | tr -d '[:space:]')"
  http_json POST "${API_BASE}/projects/${MUT_PID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${MUT_BID}\"}")
  assert_eq "integrity-block HTTP" "201" "${HTTP_STATUS}"
  assert_safe_json_file "${BODY_FILE}" "integrity-block"
  python3 - "${BODY_FILE}" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["state"]=="blocked"
assert b["blockedCode"] in ("review_context_integrity_mismatch","review_context_limit_exceeded")
assert (b.get("attemptCount") in (None, 0))
assert b.get("hasTransmission") in (False, None)
print("ok")
PY
  BLOCK_CODE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["blockedCode"])' "${BODY_FILE}")"
  pass "blocked before provider code=${BLOCK_CODE}"
  TX_B1="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${MUT_PID}';" | tr -d '[:space:]')"
  assert_eq "blocked path zero transmissions" "${TX_B0}" "${TX_B1}"
  CT_MUT="$(sql_ro "SELECT content_transmitted::text FROM context_disclosure_approvals WHERE id='${MUT_AID}';" | tr -d '[:space:]')"
  assert_eq "mut approval still not transmitted" "false" "${CT_MUT}"
  rm -f "${BODY_FILE}"
else
  assert_eq "blocked HTTP" "201" "${HTTP_STATUS}"
  assert_eq "blocked state" "blocked" "${BLOCK_STATE}"
  TX_B1="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
  assert_eq "blocked path zero new transmissions" "${TX_B0}" "${TX_B1}"
  rm -f "${BODY_FILE}"
fi

# ---------------------------------------------------------------------------
section "C. Failed path after provider (invalid key temp container)"
stop_temp_container "${BADKEY_CONTAINER}"
(
  cd "${REPO_ROOT}"
  # Invalid non-empty key → outbound attempt begins → auth/provider failure.
  docker compose run -d --name "${BADKEY_CONTAINER}" --no-deps \
    -e DEEPSEEK_API_KEY='sp-hv-invalid-key-not-real' \
    -p 3002:3000 \
    api >/dev/null
)
wait_health "${BADKEY_API_BASE}" "badkey-api" 90
MAIN_KEY="$(docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi')"
assert_eq "main key still present during badkey harness" "present" "${MAIN_KEY}"
# Ensure covering prereqs exist on shared DB for PROJECT_ID / BUNDLE_OK_ID
TX_C0="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
CALLS_LOG_BEFORE="$(docker logs "${BADKEY_CONTAINER}" 2>&1 | wc -l | tr -d ' ')"
http_json POST "${BADKEY_API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_OK_ID}\"}")
assert_eq "badkey create HTTP" "201" "${HTTP_STATUS}"
assert_safe_json_file "${BODY_FILE}" "badkey-run"
python3 - "${BODY_FILE}" "${META_DIR}/failed.json" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["state"]=="failed"
assert b.get("failedCode") in (
  "deepseek_auth_failed","deepseek_request_rejected","deepseek_provider_unavailable",
  "deepseek_transport_failed","deepseek_timeout","deepseek_gateway_failed",
  "deepseek_response_invalid","deepseek_schema_invalid","deepseek_empty_response",
  "deepseek_truncated_response","deepseek_model_mismatch","deepseek_insufficient_balance",
  "deepseek_rate_limited",
)
ac=b.get("attemptCount")
assert isinstance(ac,int) and ac>=1
tx=b.get("transmission")
assert isinstance(tx, dict)
assert tx.get("outcome") in ("provider_failed","response_invalid")
json.dump({
  "state": b["state"],
  "failedCode": b.get("failedCode"),
  "attemptCount": ac,
  "transmissionOutcome": tx.get("outcome"),
  "id": b["id"],
}, open(sys.argv[2],"w"))
print("ok")
PY
FAIL_RUN_ID="$(python3 -c 'import json; print(json.load(open("'"${META_DIR}/failed.json"'"))["id"])')"
pass "failed-after-provider run id_len=${#FAIL_RUN_ID}"
TX_C1="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE review_run_id='${FAIL_RUN_ID}';" | tr -d '[:space:]')"
assert_eq "failed path exactly one transmission" "1" "${TX_C1}"
# No second DeepSeek call: only one logical gateway invocation (retries allowed inside)
NEW_LOGS="$(docker logs "${BADKEY_CONTAINER}" 2>&1 | tail -n +$((CALLS_LOG_BEFORE + 1)) | sanitize_stream || true)"
GATEWAY_EVENTS="$(printf '%s\n' "${NEW_LOGS}" | grep -c '"event":"review_run_gateway"' || true)"
if [[ "${GATEWAY_EVENTS}" -le 1 ]]; then
  pass "no second logical gateway invocation (events=${GATEWAY_EVENTS})"
else
  fail "unexpected multiple review_run_gateway events=${GATEWAY_EVENTS}" || true
fi
rm -f "${BODY_FILE}"
stop_temp_container "${BADKEY_CONTAINER}"
wait_health "${API_BASE}" "main-api-after-badkey" 20

# ---------------------------------------------------------------------------
section "D. Missing-key path (empty key temp container)"
stop_temp_container "${NOKEY_CONTAINER}"
(
  cd "${REPO_ROOT}"
  docker compose run -d --name "${NOKEY_CONTAINER}" --no-deps \
    -e DEEPSEEK_API_KEY= \
    -p 3001:3000 \
    api >/dev/null
)
wait_health "${NOKEY_API_BASE}" "nokey-api" 90
wait_health "${API_BASE}" "main-api-during-nokey" 10
http_json GET "${NOKEY_API_BASE}/health"
assert_eq "nokey /health HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
TX_D0="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
http_json POST "${NOKEY_API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_OK_ID}\"}")
assert_eq "nokey create HTTP" "201" "${HTTP_STATUS}"
python3 - "${BODY_FILE}" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b["state"]=="failed"
assert b["failedCode"]=="deepseek_not_configured"
assert b.get("attemptCount") in (0, None) or b.get("attemptCount")==0
assert b.get("hasTransmission") in (False, None) or b.get("transmission") in (None, {})
# attemptCount must be 0
assert (b.get("attemptCount") or 0) == 0
print("ok")
PY
pass "missing-key failed deepseek_not_configured attemptCount=0"
TX_D1="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE project_id='${PROJECT_ID}';" | tr -d '[:space:]')"
assert_eq "missing-key zero transmission delta" "${TX_D0}" "${TX_D1}"
rm -f "${BODY_FILE}"
stop_temp_container "${NOKEY_CONTAINER}"
# Confirm .env / main key untouched
MAIN_KEY2="$(docker exec specpilot-api sh -c 'if [ -n "${DEEPSEEK_API_KEY:-}" ]; then echo present; else echo absent; fi')"
assert_eq "main key present after nokey harness" "present" "${MAIN_KEY2}"
wait_health "${API_BASE}" "main-api-restored" 20

# ---------------------------------------------------------------------------
section "E. Concurrency + stale recovery"
# Non-stale in-flight → 409
sql_ro "INSERT INTO review_runs (id, project_id, configuration_version_id, stage, state, created_at, updated_at)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${PROJECT_ID}', '${CFG_ID}', 'new', 'running', NOW(), NOW());" >/dev/null || \
sql_ro "INSERT INTO review_runs (id, project_id, configuration_version_id, stage, change_id, state, created_at, updated_at)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${PROJECT_ID}', '${CFG_ID}', 'new', NULL, 'running', NOW(), NOW());" >/dev/null
http_json POST "${API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_OK_ID}\"}")
assert_eq "non-stale conflict HTTP" "409" "${HTTP_STATUS}"
python3 - "${BODY_FILE}" <<'PY'
import json,sys
b=json.load(open(sys.argv[1]))
assert b.get("code")=="review_run_in_progress"
print("ok")
PY
pass "non-stale in-flight → 409 review_run_in_progress"
rm -f "${BODY_FILE}"
# Stale → interrupted then new run allowed
sql_ro "UPDATE review_runs SET updated_at = NOW() - INTERVAL '181 seconds' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" >/dev/null
http_json POST "${API_BASE}/projects/${PROJECT_ID}/review-runs" <(printf '%s\n' "{\"stage\":\"new\",\"contextBundleId\":\"${BUNDLE_OK_ID}\"}")
assert_eq "after-stale create HTTP" "201" "${HTTP_STATUS}"
STALE_STATE="$(sql_ro "SELECT state FROM review_runs WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" | tr -d '[:space:]')"
assert_eq "stale run failed" "failed" "${STALE_STATE}"
STALE_CODE="$(sql_ro "SELECT failed_code FROM review_runs WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" | tr -d '[:space:]')"
assert_eq "stale failed_code interrupted" "review_run_interrupted" "${STALE_CODE}"
STALE_TR="$(sql_ro "SELECT COUNT(*) FROM review_run_transitions WHERE review_run_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND code='review_run_interrupted';" | tr -d '[:space:]')"
assert_eq "stale interrupted transition present" "1" "${STALE_TR}"
pass "stale recovery then new run created (HTTP 201)"
# Ensure no automatic replay of stale provider call — stale row never had transmission
STALE_TX="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_transmissions WHERE review_run_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';" | tr -d '[:space:]')"
assert_eq "stale run zero transmissions / no replay" "0" "${STALE_TX}"
rm -f "${BODY_FILE}"

# ---------------------------------------------------------------------------
section "F. Persistence / immutability summary"
INV="$(sql_ro "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='context_disclosure_transmissions' AND column_name='review_run_id';" | tr -d '[:space:]')"
assert_eq "transmission.review_run_id column exists" "1" "${INV}"
UQ="$(sql_ro "SELECT COUNT(*) FROM pg_indexes WHERE tablename='context_disclosure_transmissions' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%review_run_id%';" | tr -d '[:space:]')"
# Prisma @@unique creates unique index
UQ2="$(sql_ro "SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE '%review_run_id%' OR conname LIKE '%reviewRunId%';" | tr -d '[:space:]')"
if [[ "${UQ}" -ge 1 || "${UQ2}" -ge 1 ]]; then
  pass "UNIQUE review_run_id enforced"
else
  # fallback: unique index name from prisma
  UQ3="$(sql_ro "SELECT COUNT(*) FROM pg_indexes WHERE tablename='context_disclosure_transmissions' AND indexdef ILIKE '%review_run_id%';" | tr -d '[:space:]')"
  assert_eq "index on transmission.review_run_id" "1" "${UQ3}"
fi
# Terminal immutability: attempt SQL-visible state remains completed for success run
TERM="$(sql_ro "SELECT state FROM review_runs WHERE id='${SUCCESS_RUN_ID}';" | tr -d '[:space:]')"
assert_eq "success run still completed" "completed" "${TERM}"

section "Summary"
log "PASS_COUNT=${PASS_COUNT}"
log "FAIL_COUNT=${FAIL_COUNT}"
if [[ "${FAIL_COUNT}" -ne 0 ]]; then
  fail "human validation finished with failures"
fi
pass "all human-validation checks PASS"
