#!/usr/bin/env bash
# Operator human-validation script for chg-w02-s02-secret-detection-and-exclusion.
# Disposable projects only. Runtime-built detector fixtures. Sanitized report.
# Does not mark task 8.1 complete. Does not Verify/sync/archive/commit/push.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
REPORT="${REPORT_PATH:-/tmp/sp-w02-s02-operator-validation-$(date +%Y%m%dT%H%M%S).txt}"

# Load SPECPILOT_HOST_REPOS_ROOT from gitignored .env when present (do not print secrets).
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
  # Usage: http_json METHOD URL [DATA_FILE]
  # Sets: HTTP_STATUS BODY_FILE
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
  # Sets REGISTERED_PROJECT_ID. Logs to REPORT; does not echo PASS lines as the sole stdout contract.
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

# Build github_pat fixture at runtime from fragments. Prints path only; never prints token.
write_github_pat_fixture() {
  local out_file="$1"
  python3 - "${out_file}" <<'PY'
import sys
path = sys.argv[1]
prefix = "ghp_"
body = "abcdefghijklmnopqrstuvwxyz" + "0123456789"
# Do not print token.
open(path, "w", encoding="utf-8").write("note " + prefix + body + "\n")
print(path)
PY
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
      log "docker compose -f ${REPO_ROOT}/compose.yaml exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -c \"DELETE FROM projects WHERE id = '${id}';\""
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
section "w02-s02 operator human validation"
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
http_json POST "${API_BASE}/projects/00000000-0000-0000-0000-000000000000/context-sources/secret-scan" "${FRESH_REQ}"
rm -f "${FRESH_REQ}"
# Ensure route exists: project_not_found (404) is expected; "Cannot POST" would mean stale API.
if [[ "${HTTP_STATUS}" == "404" ]]; then
  if python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
raise SystemExit(0 if body.get("code") == "project_not_found" else 1)
PY
  then
    pass "secret-scan route is live (project_not_found)"
  else
    fail "secret-scan route appears missing/stale (body not project_not_found)"
  fi
else
  fail "secret-scan freshness check unexpected HTTP ${HTTP_STATUS}"
fi
rm -f "${BODY_FILE}"

STAMP="$(date +%Y%m%dT%H%M%S)-$$"

# ---------------------------------------------------------------------------
# Scenario 1 — clean success
# ---------------------------------------------------------------------------
section "Scenario 1: clean success (disposable project)"

CLEAN_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s02-clean-${STAMP}"
mkdir -p "${CLEAN_DIR}/.specpilot" "${CLEAN_DIR}/docs"
track_dir "${CLEAN_DIR}"
log "Created disposable clean repo (path omitted from log body for brevity)"
write_project_yaml "${CLEAN_DIR}/.specpilot/project.yaml" "sp-w02-s02-clean" "W02 S02 Clean Fixture"
printf '%s\n' 'alpha ordinary text' >"${CLEAN_DIR}/docs/a.md"
printf '%s\n' 'bravo ordinary text' >"${CLEAN_DIR}/docs/b.md"

CLEAN_ID=""
register_project "${CLEAN_DIR}" "w02-s02-clean-fixture"
CLEAN_ID="${REGISTERED_PROJECT_ID}"
track_id "${CLEAN_ID}"
log "clean project id=${CLEAN_ID}"

REQ1="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ1}"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-sources/secret-scan" "${REQ1}"
rm -f "${REQ1}"
S1_BODY="${BODY_FILE}"
assert_eq "scenario1 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S1_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(body.get("stage") == "planning", f"stage={body.get('stage')!r}")
check(isinstance(body.get("configurationVersionId"), str) and body["configurationVersionId"], "configurationVersionId missing")
check(isinstance(body.get("sourceHash"), str) and body["sourceHash"], "sourceHash missing")
paths = body.get("eligiblePaths")
check(isinstance(paths, list), "eligiblePaths not a list")
check(body.get("candidatePathCount", 0) >= 2, f"candidatePathCount={body.get('candidatePathCount')}")
check(body.get("eligiblePathCount") == len(paths), "eligiblePathCount != len(eligiblePaths)")
check(body.get("eligiblePathCount") == body.get("candidatePathCount"), "eligiblePathCount != candidatePathCount")
check(body.get("findings") == [], f"findings={body.get('findings')!r}")
check(body.get("unscannable") == [], f"unscannable={body.get('unscannable')!r}")
if isinstance(paths, list):
    check(paths == sorted(paths), "eligiblePaths not deterministic a < b order")
    for p in paths:
        check(isinstance(p, str) and not p.startswith("/") and not p.startswith("./"), f"bad path {p!r}")
        check("\\" not in p and ".." not in p.split("/"), f"bad path segments {p!r}")

forbidden_keys = {
    "content", "contents", "fileContent", "bytes", "text", "payload",
    "matchedValue", "snippet", "offset", "offsets", "line", "lineNumber",
    "lineNumbers", "surroundingContext", "context",
}
for key in forbidden_keys:
    check(key not in body, f"forbidden field present: {key}")
raw = open(sys.argv[1], encoding="utf-8").read()
for needle in ("matchedValue", "snippet", "surroundingContext", "alpha ordinary text", "bravo ordinary text"):
    check(needle not in raw, f"response leaked {needle!r}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario1 clean success contract")
print(f"INFO: candidatePathCount={body.get('candidatePathCount')} eligiblePathCount={body.get('eligiblePathCount')}")
PY
rm -f "${S1_BODY}"

# ---------------------------------------------------------------------------
# Scenario 2 — partial exclusion success (reuse clean project; add dirty file)
# ---------------------------------------------------------------------------
section "Scenario 2: partial exclusion success"

DIRTY_PATH="${CLEAN_DIR}/docs/dirty.md"
write_github_pat_fixture "${DIRTY_PATH}" >/dev/null
# Never log constructed secret.

REQ2="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ2}"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-sources/secret-scan" "${REQ2}"
rm -f "${REQ2}"
S2_BODY="${BODY_FILE}"
assert_eq "scenario2 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S2_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(body.get("candidatePathCount", 0) >= 2, f"candidatePathCount={body.get('candidatePathCount')}")
check(body.get("eligiblePathCount", 0) >= 1, f"eligiblePathCount={body.get('eligiblePathCount')}")
eligible = body.get("eligiblePaths") or []
findings = body.get("findings") or []
check("docs/dirty.md" not in eligible, "dirty path still eligible")
check("docs/a.md" in eligible or "docs/b.md" in eligible, "clean path missing from eligible")
check(isinstance(findings, list) and len(findings) >= 1, "expected findings")
for f in findings:
    check(set(f.keys()) == {"path", "detectorId"}, f"finding keys={sorted(f.keys())}")
    check(f.get("path") == "docs/dirty.md", f"unexpected finding path {f.get('path')!r}")
github = [f for f in findings if f.get("detectorId") == "github_pat"]
check(len(github) == 1, f"expected exactly one github_pat finding, got {findings!r}")
raw = open(sys.argv[1], encoding="utf-8").read()
check("ghp_" not in raw, "response leaked github_pat prefix/value")
check("matchedValue" not in raw and "snippet" not in raw, "response leaked match metadata")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario2 partial exclusion success")
print(f"INFO: eligiblePathCount={body.get('eligiblePathCount')} findingCount={len(findings)}")
PY
rm -f "${S2_BODY}"

# ---------------------------------------------------------------------------
# Scenario 3 — unsafe_context_bundle
# ---------------------------------------------------------------------------
section "Scenario 3: unsafe_context_bundle (disposable project)"

UNSAFE_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s02-unsafe-${STAMP}"
mkdir -p "${UNSAFE_DIR}/.specpilot" "${UNSAFE_DIR}/docs"
track_dir "${UNSAFE_DIR}"
write_project_yaml "${UNSAFE_DIR}/.specpilot/project.yaml" "sp-w02-s02-unsafe" "W02 S02 Unsafe Fixture"
write_github_pat_fixture "${UNSAFE_DIR}/docs/only.md" >/dev/null

UNSAFE_ID=""
register_project "${UNSAFE_DIR}" "w02-s02-unsafe-fixture"
UNSAFE_ID="${REGISTERED_PROJECT_ID}"
track_id "${UNSAFE_ID}"
log "unsafe project id=${UNSAFE_ID}"

REQ3="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ3}"
http_json POST "${API_BASE}/projects/${UNSAFE_ID}/context-sources/secret-scan" "${REQ3}"
rm -f "${REQ3}"
S3_BODY="${BODY_FILE}"
assert_eq "scenario3 HTTP" "422" "${HTTP_STATUS}"

python3 - "${S3_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "blocked", f"status={body.get('status')!r}")
check(body.get("code") == "unsafe_context_bundle", f"code={body.get('code')!r}")
check(body.get("stage") == "planning", f"stage={body.get('stage')!r}")
for req in ("candidatePathCount", "findingCount", "unscannableCount"):
    check(req in body and isinstance(body[req], (int, float)), f"{req} missing")
for forbidden in ("eligiblePaths", "findings", "unscannable", "eligiblePathCount"):
    check(forbidden not in body, f"forbidden field present: {forbidden}")
raw = open(sys.argv[1], encoding="utf-8").read()
for needle in ("matchedValue", "snippet", "offset", "lineNumber", "ghp_", "docs/only.md", "/Users/", "stack"):
    check(needle not in raw, f"unsafe response leaked {needle!r}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario3 unsafe_context_bundle counts-only body")
print(
    "INFO: counts candidate={c} finding={f} unscannable={u}".format(
        c=body.get("candidatePathCount"),
        f=body.get("findingCount"),
        u=body.get("unscannableCount"),
    )
)
PY
rm -f "${S3_BODY}"

# ---------------------------------------------------------------------------
# Scenario 4 — optional unscannable + clean
# ---------------------------------------------------------------------------
section "Scenario 4: unscannable_content with remaining eligible path"

UNSCAN_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s02-unscan-${STAMP}"
mkdir -p "${UNSCAN_DIR}/.specpilot" "${UNSCAN_DIR}/docs"
track_dir "${UNSCAN_DIR}"
write_project_yaml "${UNSCAN_DIR}/.specpilot/project.yaml" "sp-w02-s02-unscan" "W02 S02 Unscan Fixture"
printf '%s\n' 'clean ordinary text' >"${UNSCAN_DIR}/docs/clean.md"
python3 - "${UNSCAN_DIR}/docs/bin.dat" <<'PY'
import sys
# NUL byte => unscannable_content
open(sys.argv[1], "wb").write(b"a\x00b")
PY

UNSCAN_ID=""
register_project "${UNSCAN_DIR}" "w02-s02-unscan-fixture"
UNSCAN_ID="${REGISTERED_PROJECT_ID}"
track_id "${UNSCAN_ID}"
log "unscan project id=${UNSCAN_ID}"

REQ4="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ4}"
http_json POST "${API_BASE}/projects/${UNSCAN_ID}/context-sources/secret-scan" "${REQ4}"
rm -f "${REQ4}"
S4_BODY="${BODY_FILE}"
assert_eq "scenario4 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S4_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r}")
eligible = body.get("eligiblePaths") or []
unscannable = body.get("unscannable") or []
check("docs/bin.dat" not in eligible, "unscannable path still eligible")
check("docs/clean.md" in eligible, "clean path missing")
check(len(unscannable) >= 1, "expected unscannable entries")
for u in unscannable:
    check(set(u.keys()) == {"path", "reason"}, f"unscannable keys={sorted(u.keys())}")
    check(u.get("reason") == "unscannable_content", f"reason={u.get('reason')!r}")
raw = open(sys.argv[1], encoding="utf-8").read()
check("\\u0000" not in raw and "\x00" not in raw, "NUL/bytes leaked in response")
check("clean ordinary text" not in raw, "file contents leaked")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario4 unscannable exclusion with remaining eligible")
PY
rm -f "${S4_BODY}"

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
exit 0
