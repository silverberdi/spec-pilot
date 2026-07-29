#!/usr/bin/env bash
# Operator human-validation script for chg-w02-s03-context-bundle-manifest.
# Disposable projects only. Runtime-built fixtures. Sanitized report.
# Does not mark task 10.1 complete. Does not Verify/sync/archive/commit/push.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
REPORT="${REPORT_PATH:-/tmp/sp-w02-s03-operator-validation-$(date +%Y%m%dT%H%M%S).txt}"

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
PASS_COUNT=0
FAIL_COUNT=0

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

http_json() {
  local method="$1"
  local url="$2"
  local data_file="${3:-}"
  BODY_FILE="$(mktemp)"
  local curl_args=(-sS -X "${method}" -o "${BODY_FILE}" -w '%{http_code}' "${url}")
  if [[ -n "${data_file}" ]]; then
    curl_args+=(-H 'content-type: application/json' --data-binary @"${data_file}")
  fi
  HTTP_STATUS="$(curl "${curl_args[@]}")"
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
  local include_glob="${4:-docs/**}"
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
    - ${include_glob}
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
  # Read-only SQL against SpecPilot postgres only. Prints query result to stdout.
  local sql="$1"
  (
    cd "${REPO_ROOT}"
    docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -t -A -c "${sql}"
  )
}

cleanup() {
  if [[ "${CLEANUP_DONE}" -eq 1 ]]; then
    return 0
  fi
  CLEANUP_DONE=1
  section "Cleanup (exact commands)"

  if [[ "${#DISPOSABLE_IDS[@]}" -eq 0 ]]; then
    log "# No disposable project ids recorded; skip DB deletes"
  else
    for id in "${DISPOSABLE_IDS[@]}"; do
      log "docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -c \"DELETE FROM projects WHERE id = '${id}';\""
    done
  fi

  if [[ "${#DISPOSABLE_DIRS[@]}" -eq 0 ]]; then
    log "# No disposable directories recorded; skip filesystem deletes"
  else
    for d in "${DISPOSABLE_DIRS[@]}"; do
      log "rm -rf -- ${d}"
    done
  fi

  (
    cd "${REPO_ROOT}"
    for id in "${DISPOSABLE_IDS[@]+"${DISPOSABLE_IDS[@]}"}"; do
      docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 \
        -c "DELETE FROM projects WHERE id = '${id}';"
      log "Executed DB delete for project id=${id}"
    done
  )

  for d in "${DISPOSABLE_DIRS[@]+"${DISPOSABLE_DIRS[@]}"}"; do
    if [[ -e "${d}" ]]; then
      rm -rf -- "${d}"
      log "Executed rm -rf for disposable directory ${d}"
    fi
  done

  for id in "${DISPOSABLE_IDS[@]+"${DISPOSABLE_IDS[@]}"}"; do
    http_json GET "${API_BASE}/projects/${id}"
    if [[ "${HTTP_STATUS}" == "404" ]]; then
      pass "disposable project GET returns 404 after cleanup (${id})"
    else
      fail "disposable project GET expected 404 for ${id}, got ${HTTP_STATUS}" || true
    fi
    rm -f "${BODY_FILE}"

    local left
    left="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${id}';" | tr -d '[:space:]')"
    if [[ "${left}" == "0" ]]; then
      pass "no context_bundles remain for project ${id}"
    else
      fail "context_bundles remain for ${id}: count=${left}" || true
    fi
  done

  for d in "${DISPOSABLE_DIRS[@]+"${DISPOSABLE_DIRS[@]}"}"; do
    if [[ ! -e "${d}" ]]; then
      pass "disposable directory no longer exists (${d})"
    else
      fail "disposable directory still exists: ${d}" || true
    fi
  done

  log "Cleanup finished (no volume reset; axioma-db-dev untouched)."
}

trap cleanup EXIT

: >"${REPORT}"
section "w02-s03 operator human validation"
log "API_BASE=${API_BASE}"
log "HOST_REPOS_ROOT=${SPECPILOT_HOST_REPOS_ROOT}"
log "REPORT=${REPORT}"
log "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

section "Runtime freshness"
http_json GET "${API_BASE}/health"
assert_eq "GET /health HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
FRESH_REQ="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${FRESH_REQ}"
http_json POST "${API_BASE}/projects/00000000-0000-0000-0000-000000000000/context-bundles" "${FRESH_REQ}"
rm -f "${FRESH_REQ}"
if [[ "${HTTP_STATUS}" == "404" ]]; then
  if python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
raise SystemExit(0 if body.get("code") == "project_not_found" else 1)
PY
  then
    pass "context-bundles route is live (project_not_found)"
  else
    fail "context-bundles route appears missing/stale (body not project_not_found)"
  fi
else
  fail "context-bundles freshness check unexpected HTTP ${HTTP_STATUS}"
fi
rm -f "${BODY_FILE}"

# Confirm no content_transmitted column before scenarios (immutable schema check).
COL_CHECK="$(sql_ro "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'context_bundles' AND column_name = 'content_transmitted';" | tr -d '[:space:]')"
assert_eq "no content_transmitted column" "0" "${COL_CHECK}"

STAMP="$(date +%Y%m%dT%H%M%S)-$$"
EXISTING_PROJECT_COUNT_BEFORE="$(sql_ro "SELECT COUNT(*) FROM projects;" | tr -d '[:space:]')"
log "INFO: projects count before disposable work=${EXISTING_PROJECT_COUNT_BEFORE}"

# ---------------------------------------------------------------------------
# Scenario 1 — clean manifest creation
# ---------------------------------------------------------------------------
section "Scenario 1: clean manifest creation"

CLEAN_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s03-clean-${STAMP}"
mkdir -p "${CLEAN_DIR}/.specpilot" "${CLEAN_DIR}/docs"
track_dir "${CLEAN_DIR}"
write_project_yaml "${CLEAN_DIR}/.specpilot/project.yaml" "sp-w02-s03-clean" "W02 S03 Clean Fixture"
# Multi-line ASCII fixture
printf '%s\n' 'line-one ordinary text' 'line-two ordinary text' 'line-three ordinary text' >"${CLEAN_DIR}/docs/multi.md"
# Unicode fixture: multiple astral-plane code points so code-point /4 differs from UTF-16 /4 and byte /4.
python3 - "${CLEAN_DIR}/docs/unicode.md" <<'PY'
import sys
# Five U+1F600 emoji + ASCII letter: 6 code points, 11 UTF-16 units, 21 UTF-8 bytes.
text = ("\U0001F600" * 5) + "Z"
open(sys.argv[1], "w", encoding="utf-8").write(text + "\n")
PY

CLEAN_ID=""
register_project "${CLEAN_DIR}" "w02-s03-clean-fixture"
CLEAN_ID="${REGISTERED_PROJECT_ID}"
track_id "${CLEAN_ID}"
log "clean project id=${CLEAN_ID}"

REQ1="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ1}"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles" "${REQ1}"
rm -f "${REQ1}"
S1_BODY="${BODY_FILE}"
assert_eq "scenario1 HTTP" "201" "${HTTP_STATUS}"

S1_ASSERT_LOG="$(mktemp)"
BUNDLE1_ID="$(
  python3 - "${S1_BODY}" "${CLEAN_DIR}" "${CLEAN_ID}" 2>"${S1_ASSERT_LOG}" <<'PY'
import hashlib, json, math, sys
from pathlib import Path

body = json.load(open(sys.argv[1]))
repo = Path(sys.argv[2])
project_id = sys.argv[3]
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def token_estimate(text: str) -> int:
    cps = len(text)
    return 0 if cps == 0 else math.ceil(cps / 4)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(isinstance(body.get("id"), str) and body["id"], "id missing")
check(body.get("projectId") == project_id, f"projectId={body.get('projectId')!r}")
check(body.get("stage") == "planning", f"stage={body.get('stage')!r}")
check(isinstance(body.get("configurationVersionId"), str) and body["configurationVersionId"], "configurationVersionId missing")
check(isinstance(body.get("sourceHash"), str) and len(body["sourceHash"]) == 64 and body["sourceHash"] == body["sourceHash"].lower(), "sourceHash invalid")
check(body.get("manifestSchemaVersion") == 1, f"manifestSchemaVersion={body.get('manifestSchemaVersion')!r}")
check(body.get("selectionPolicyId") == "full-file-lines-v1", f"selectionPolicyId={body.get('selectionPolicyId')!r}")
check(body.get("tokenEstimatorId") == "unicode-codepoints-div-4-v1", f"tokenEstimatorId={body.get('tokenEstimatorId')!r}")
mh = body.get("manifestHash")
check(isinstance(mh, str) and len(mh) == 64 and mh == mh.lower() and all(c in "0123456789abcdef" for c in mh), "manifestHash invalid")
entries = body.get("entries")
exclusions = body.get("exclusions")
check(isinstance(entries, list), "entries not list")
check(isinstance(exclusions, list), "exclusions not list")
check(body.get("entryCount") == len(entries), "entryCount != len(entries)")
check(body.get("eligiblePathCount") == body.get("entryCount"), "eligiblePathCount != entryCount")
check(body.get("excludedPathCount") == len(exclusions), "excludedPathCount != len(exclusions)")
check("contentTransmitted" not in body, "contentTransmitted must be absent")

expected_sum = 0
path_to_entry = {e.get("path"): e for e in entries if isinstance(e, dict)}
for rel in ("docs/multi.md", "docs/unicode.md"):
    check(rel in path_to_entry, f"missing entry {rel}")
    e = path_to_entry.get(rel) or {}
    raw = (repo / rel).read_bytes()
    text = raw.decode("utf-8")
    exp_hash = sha256_hex(raw)
    exp_tok = token_estimate(text)
    expected_sum += exp_tok
    ch = e.get("contentHash")
    check(isinstance(ch, str) and len(ch) == 64 and ch == ch.lower() and ch == exp_hash, f"{rel} contentHash mismatch")
    check(e.get("tokenEstimate") == exp_tok, f"{rel} tokenEstimate expected {exp_tok} got {e.get('tokenEstimate')}")
    ranges = e.get("lineRanges")
    check(isinstance(ranges, list) and len(ranges) == 1, f"{rel} expected one full-file range")
    if ranges:
        check(ranges[0].get("startLine") == 1, f"{rel} startLine")
        check(ranges[0].get("endLine") == len(text.split("\n")), f"{rel} endLine")
    check(isinstance(e.get("path"), str) and not e["path"].startswith("/") and not e["path"].startswith("./"), f"bad path {e.get('path')!r}")

check(body.get("totalTokenEstimate") == expected_sum, f"totalTokenEstimate expected {expected_sum} got {body.get('totalTokenEstimate')}")

uni_text = (repo / "docs/unicode.md").read_text(encoding="utf-8")
cp = len(uni_text)
utf16_units = sum(2 if ord(c) > 0xFFFF else 1 for c in uni_text)
utf8_bytes = len(uni_text.encode("utf-8"))
uni_tok = path_to_entry["docs/unicode.md"]["tokenEstimate"]
cp_tok = 0 if cp == 0 else math.ceil(cp / 4)
u16_tok = 0 if utf16_units == 0 else math.ceil(utf16_units / 4)
byte_tok = 0 if utf8_bytes == 0 else math.ceil(utf8_bytes / 4)
check(uni_tok == cp_tok, "unicode token must use code points")
check(cp_tok != u16_tok, "fixture must diverge code-point vs UTF-16 token estimate")
check(cp_tok != byte_tok, "fixture must diverge code-point vs byte token estimate")

forbidden_keys = {
    "content", "contents", "fileContent", "bytes", "text", "payload",
    "matchedValue", "snippet", "offset", "offsets", "line", "lineNumber",
    "lineNumbers", "surroundingContext", "contentTransmitted",
}
for key in forbidden_keys:
    check(key not in body, f"forbidden field present: {key}")
raw_json = open(sys.argv[1], encoding="utf-8").read()
for needle in ("line-one ordinary text", "matchedValue", "snippet", "/Users/", "SPECPILOT_HOST"):
    check(needle not in raw_json, f"response leaked {needle!r}")

if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    raise SystemExit(1)
print("PASS: scenario1 clean create contract + independent hash/token checks", file=sys.stderr)
print(f"INFO: entryCount={body.get('entryCount')} totalTokenEstimate={body.get('totalTokenEstimate')}", file=sys.stderr)
print(f"INFO: unicode codePoints={cp} utf16Units={utf16_units} utf8Bytes={utf8_bytes} token={uni_tok}", file=sys.stderr)
print(body["id"], end="")
PY
)"
tee -a "${REPORT}" <"${S1_ASSERT_LOG}" >/dev/null
cat "${S1_ASSERT_LOG}" >&2 || true
rm -f "${S1_ASSERT_LOG}"
S1_MANIFEST_HASH="$(python3 - "${S1_BODY}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["manifestHash"])
PY
)"
pass "scenario1 clean create (bundle1 id=${BUNDLE1_ID})"
S1_KEEP="$(mktemp)"
cp "${S1_BODY}" "${S1_KEEP}"
rm -f "${S1_BODY}"

# ---------------------------------------------------------------------------
# Scenario 2 — GET by id
# ---------------------------------------------------------------------------
section "Scenario 2: GET by id"

http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}"
S2_BODY="${BODY_FILE}"
assert_eq "scenario2 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S1_KEEP}" "${S2_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
created = json.load(open(sys.argv[1]))
fetched = json.load(open(sys.argv[2]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

for key in (
    "id", "projectId", "stage", "configurationVersionId", "sourceHash",
    "manifestSchemaVersion", "selectionPolicyId", "tokenEstimatorId",
    "manifestHash", "entryCount", "totalTokenEstimate", "candidatePathCount",
    "eligiblePathCount", "excludedPathCount", "findingCount", "unscannableCount",
    "createdAt", "entries", "exclusions", "status",
):
    check(created.get(key) == fetched.get(key), f"{key} changed on GET")
check("contentTransmitted" not in fetched, "contentTransmitted appeared on GET")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario2 GET equals persisted create material")
PY
rm -f "${S2_BODY}"

# ---------------------------------------------------------------------------
# Scenario 3 — latest lookup
# ---------------------------------------------------------------------------
section "Scenario 3: latest lookup"

http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles?stage=planning&limit=1"
S3_BODY="${BODY_FILE}"
assert_eq "scenario3 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S3_BODY}" "${BUNDLE1_ID}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
expected_id = sys.argv[2]
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
items = body.get("items")
check(isinstance(items, list) and len(items) == 1, f"items length={None if not isinstance(items, list) else len(items)}")
if isinstance(items, list) and items:
    check(items[0].get("id") == expected_id, f"latest id={items[0].get('id')!r} expected {expected_id}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario3 latest returns most recent bundle")
PY
rm -f "${S3_BODY}"

# ---------------------------------------------------------------------------
# Scenario 4 — append-only duplicate material
# ---------------------------------------------------------------------------
section "Scenario 4: append-only duplicate material"

REQ4="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ4}"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles" "${REQ4}"
rm -f "${REQ4}"
S4_BODY="${BODY_FILE}"
assert_eq "scenario4 HTTP" "201" "${HTTP_STATUS}"

S4_ASSERT_LOG="$(mktemp)"
BUNDLE2_ID="$(
  python3 - "${S4_BODY}" "${BUNDLE1_ID}" "${S1_MANIFEST_HASH}" 2>"${S4_ASSERT_LOG}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
first_id = sys.argv[2]
first_hash = sys.argv[3]
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(body.get("id") != first_id, "second create reused UUID")
check(body.get("manifestHash") == first_hash, "manifestHash changed for identical material")
check("contentTransmitted" not in body, "contentTransmitted present")

if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    raise SystemExit(1)
print("PASS: scenario4 append-only duplicate material", file=sys.stderr)
print(body["id"], end="")
PY
)"
tee -a "${REPORT}" <"${S4_ASSERT_LOG}" >/dev/null
cat "${S4_ASSERT_LOG}" >&2 || true
rm -f "${S4_ASSERT_LOG}" "${S4_BODY}"
pass "scenario4 append-only (bundle2 id=${BUNDLE2_ID})"

http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}"
assert_eq "fetch bundle1 after duplicate HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"
http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE2_ID}"
assert_eq "fetch bundle2 HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"

ROW_COUNT_CLEAN="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "clean project bundle row count" "2" "${ROW_COUNT_CLEAN}"
DUP_HASH_COUNT="$(sql_ro "SELECT COUNT(DISTINCT manifest_hash) FROM context_bundles WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "duplicate material shares one manifest_hash" "1" "${DUP_HASH_COUNT}"

# ---------------------------------------------------------------------------
# Scenario 5 — empty manifest success
# ---------------------------------------------------------------------------
section "Scenario 5: empty manifest success"

EMPTY_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s03-empty-${STAMP}"
mkdir -p "${EMPTY_DIR}/.specpilot" "${EMPTY_DIR}/docs"
track_dir "${EMPTY_DIR}"
# Include pattern that matches nothing under docs/
write_project_yaml "${EMPTY_DIR}/.specpilot/project.yaml" "sp-w02-s03-empty" "W02 S03 Empty Fixture" "docs/does-not-exist/**"
printf '%s\n' 'ignored because include misses' >"${EMPTY_DIR}/docs/ignored.md"

EMPTY_ID=""
register_project "${EMPTY_DIR}" "w02-s03-empty-fixture"
EMPTY_ID="${REGISTERED_PROJECT_ID}"
track_id "${EMPTY_ID}"
log "empty project id=${EMPTY_ID}"

REQ5="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ5}"
http_json POST "${API_BASE}/projects/${EMPTY_ID}/context-bundles" "${REQ5}"
rm -f "${REQ5}"
S5_BODY="${BODY_FILE}"
assert_eq "scenario5 HTTP" "201" "${HTTP_STATUS}"

python3 - "${S5_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(body.get("entryCount") == 0, f"entryCount={body.get('entryCount')}")
check(body.get("eligiblePathCount") == 0, f"eligiblePathCount={body.get('eligiblePathCount')}")
check(body.get("entries") == [], "entries not empty")
check(body.get("exclusions") == [], "exclusions not empty")
check(body.get("totalTokenEstimate") == 0, f"totalTokenEstimate={body.get('totalTokenEstimate')}")
check(body.get("manifestSchemaVersion") == 1, "schema version")
check(body.get("selectionPolicyId") == "full-file-lines-v1", "selectionPolicyId")
check(body.get("tokenEstimatorId") == "unicode-codepoints-div-4-v1", "tokenEstimatorId")
mh = body.get("manifestHash")
check(isinstance(mh, str) and len(mh) == 64 and mh == mh.lower(), "manifestHash invalid")
check("contentTransmitted" not in body, "contentTransmitted present")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario5 empty manifest success")
PY
rm -f "${S5_BODY}"

# ---------------------------------------------------------------------------
# Scenario 6 — oversize + clean
# ---------------------------------------------------------------------------
section "Scenario 6: oversize plus clean"

OVER_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s03-oversize-${STAMP}"
mkdir -p "${OVER_DIR}/.specpilot" "${OVER_DIR}/docs"
track_dir "${OVER_DIR}"
write_project_yaml "${OVER_DIR}/.specpilot/project.yaml" "sp-w02-s03-over" "W02 S03 Oversize Fixture"
printf '%s\n' 'clean ordinary text for oversize scenario' >"${OVER_DIR}/docs/clean.md"
# Create >1MiB file without printing contents
python3 - "${OVER_DIR}/docs/big.bin" <<'PY'
import sys
# 1048577 bytes of 'A' — oversize; not secret-like
open(sys.argv[1], "wb").write(b"A" * 1048577)
PY

OVER_ID=""
register_project "${OVER_DIR}" "w02-s03-oversize-fixture"
OVER_ID="${REGISTERED_PROJECT_ID}"
track_id "${OVER_ID}"
log "oversize project id=${OVER_ID}"

REQ6="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ6}"
http_json POST "${API_BASE}/projects/${OVER_ID}/context-bundles" "${REQ6}"
rm -f "${REQ6}"
S6_BODY="${BODY_FILE}"
assert_eq "scenario6 HTTP" "201" "${HTTP_STATUS}"

python3 - "${S6_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
entries = body.get("entries") or []
exclusions = body.get("exclusions") or []
paths = [e.get("path") for e in entries]
check("docs/clean.md" in paths, "clean path missing from entries")
check("docs/big.bin" not in paths, "oversize path incorrectly in entries")
over = [x for x in exclusions if x.get("path") == "docs/big.bin"]
check(len(over) == 1, f"expected one oversize exclusion, got {exclusions!r}")
if over:
    check(over[0].get("reason") == "unscannable_content", f"reason={over[0].get('reason')!r}")
    check(set(over[0].keys()) == {"path", "reason"}, f"exclusion keys={sorted(over[0].keys())}")
for e in entries:
    check("contentHash" in e and "lineRanges" in e and "tokenEstimate" in e, "entry missing fields")
for x in exclusions:
    check("contentHash" not in x and "lineRanges" not in x and "tokenEstimate" not in x, "exclusion leaked entry fields")
raw = open(sys.argv[1], encoding="utf-8").read()
check("clean ordinary text for oversize scenario" not in raw, "file contents leaked")
check("A" * 40 not in raw, "oversize body leaked")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario6 oversize+clean")
PY
rm -f "${S6_BODY}"

# ---------------------------------------------------------------------------
# Scenario 7 — unsafe blocked (oversize-only; no secret fixtures)
# ---------------------------------------------------------------------------
section "Scenario 7: unsafe_context_bundle (oversize-only)"

UNSAFE_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s03-unsafe-${STAMP}"
mkdir -p "${UNSAFE_DIR}/.specpilot" "${UNSAFE_DIR}/docs"
track_dir "${UNSAFE_DIR}"
write_project_yaml "${UNSAFE_DIR}/.specpilot/project.yaml" "sp-w02-s03-unsafe" "W02 S03 Unsafe Fixture"
python3 - "${UNSAFE_DIR}/docs/only-big.bin" <<'PY'
import sys
open(sys.argv[1], "wb").write(b"B" * 1048577)
PY

UNSAFE_ID=""
register_project "${UNSAFE_DIR}" "w02-s03-unsafe-fixture"
UNSAFE_ID="${REGISTERED_PROJECT_ID}"
track_id "${UNSAFE_ID}"
log "unsafe project id=${UNSAFE_ID}"

REQ7="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ7}"
http_json POST "${API_BASE}/projects/${UNSAFE_ID}/context-bundles" "${REQ7}"
rm -f "${REQ7}"
S7_BODY="${BODY_FILE}"
assert_eq "scenario7 HTTP" "422" "${HTTP_STATUS}"

python3 - "${S7_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "blocked", f"status={body.get('status')!r}")
check(body.get("code") == "unsafe_context_bundle", f"code={body.get('code')!r}")
for req in ("candidatePathCount", "findingCount", "unscannableCount"):
    check(req in body and isinstance(body[req], int), f"{req} missing")
for forbidden in (
    "eligiblePaths", "entries", "exclusions", "findings", "unscannable",
    "eligiblePathCount", "manifestHash", "contentHash",
):
    check(forbidden not in body, f"forbidden field present: {forbidden}")
raw = open(sys.argv[1], encoding="utf-8").read()
for needle in ("docs/only-big.bin", "matchedValue", "snippet", "/Users/", "stack", "detectorId", "AAAA"):
    check(needle not in raw, f"unsafe response leaked {needle!r}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario7 unsafe_context_bundle counts-only")
print(
    "INFO: counts candidate={c} finding={f} unscannable={u}".format(
        c=body.get("candidatePathCount"),
        f=body.get("findingCount"),
        u=body.get("unscannableCount"),
    )
)
PY
rm -f "${S7_BODY}"

UNSAFE_ROWS="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${UNSAFE_ID}';" | tr -d '[:space:]')"
assert_eq "unsafe project persisted zero bundles" "0" "${UNSAFE_ROWS}"

# ---------------------------------------------------------------------------
# Scenario 8 — invalid latest query
# ---------------------------------------------------------------------------
section "Scenario 8: invalid latest query"

http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles?stage=planning&limit=2"
S8_BODY="${BODY_FILE}"
assert_eq "scenario8 HTTP" "422" "${HTTP_STATUS}"

python3 - "${S8_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("code") == "invalid_context_bundle_query", f"code={body.get('code')!r}")
check(body.get("status") != "blocked", "must not be ContextBundleBlockedDto status=blocked")
check("candidatePathCount" not in body, "blocked-union counts present on query error")
check(isinstance(body.get("message"), str) and body["message"], "message missing")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario8 invalid_context_bundle_query")
PY
rm -f "${S8_BODY}"

AFTER_INVALID_COUNT="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "invalid query did not create rows" "2" "${AFTER_INVALID_COUNT}"

# ---------------------------------------------------------------------------
# Scenario 9 — persistence / immutability checks (read-only SQL)
# ---------------------------------------------------------------------------
section "Scenario 9: persistence and immutability (read-only SQL)"

python3 - "${REPO_ROOT}" "${CLEAN_ID}" "${EMPTY_ID}" "${OVER_ID}" "${UNSAFE_ID}" <<'PY' | tee -a "${REPORT}"
import subprocess, sys

repo, clean_id, empty_id, over_id, unsafe_id = sys.argv[1:6]
errors = []

def sql(q: str) -> str:
    out = subprocess.check_output(
        [
            "docker", "compose", "exec", "-T", "postgres",
            "psql", "-U", "specpilot", "-d", "specpilot", "-v", "ON_ERROR_STOP=1", "-t", "-A",
            "-c", q,
        ],
        cwd=repo,
        text=True,
    )
    return out.strip()

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(sql("SELECT COUNT(*) FROM context_bundles WHERE project_id = '%s';" % clean_id) == "2", "clean row count")
check(sql("SELECT COUNT(*) FROM context_bundles WHERE project_id = '%s';" % empty_id) == "1", "empty row count")
check(sql("SELECT COUNT(*) FROM context_bundles WHERE project_id = '%s';" % over_id) == "1", "oversize row count")
check(sql("SELECT COUNT(*) FROM context_bundles WHERE project_id = '%s';" % unsafe_id) == "0", "unsafe row count")
check(
    sql(
        "SELECT COUNT(DISTINCT id) FROM context_bundles WHERE project_id = '%s';" % clean_id
    ) == "2",
    "clean has two distinct ids",
)
check(
    sql(
        "SELECT COUNT(DISTINCT manifest_hash) FROM context_bundles WHERE project_id = '%s';" % clean_id
    ) == "1",
    "clean duplicate hashes equal",
)
check(
    sql(
        "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='context_bundles' AND column_name='content_transmitted'"
    ) == "0",
    "content_transmitted column exists",
)

# Sample JSON metadata only — ensure no common leakage markers.
sample = sql(
    "SELECT entries::text || exclusions::text FROM context_bundles WHERE project_id = '%s' LIMIT 1;"
    % clean_id
)
for needle in ("line-one ordinary text", "café", "matchedValue", "snippet", "/Users/", "repository_path"):
    check(needle not in sample, f"persisted JSON leaked {needle!r}")

# Absolute repository paths live on projects, not in bundle JSON payloads.
check("repositoryPath" not in sample and "repository_path" not in sample, "absolute path field in bundle JSON")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario9 persistence invariants")
PY

EXISTING_PROJECT_COUNT_MID="$(sql_ro "SELECT COUNT(*) FROM projects;" | tr -d '[:space:]')"
log "INFO: projects count mid-run=${EXISTING_PROJECT_COUNT_MID} (includes disposables)"

# ---------------------------------------------------------------------------
# Summary (cleanup runs via EXIT trap)
# ---------------------------------------------------------------------------
section "Summary before cleanup trap"
log "PASS_COUNT=${PASS_COUNT} (shell asserts; Python asserts logged above)"
log "FAIL_COUNT=${FAIL_COUNT}"
if [[ "${FAIL_COUNT}" -ne 0 ]]; then
  log "RESULT=FAIL"
  if command -v pbcopy >/dev/null 2>&1; then
    pbcopy <"${REPORT}"
    log "Sanitized report copied to clipboard via pbcopy"
  fi
  log "Report path: ${REPORT}"
  exit 1
fi
log "RESULT=PASS (scenarios complete; cleanup follows via trap)"

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"${REPORT}"
  log "Sanitized report copied to clipboard via pbcopy"
else
  log "pbcopy not available; report is at ${REPORT}"
fi

log "Report path: ${REPORT}"
rm -f "${S1_KEEP}"
exit 0
