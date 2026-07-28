#!/usr/bin/env bash
# Operator human-validation script for chg-w02-s01-context-source-resolution.
# Safe, copyable, disposable-project cleanup. Does not modify SpecPilot source files.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
REPORT="${REPORT_PATH:-/tmp/sp-w02-s01-operator-validation-$(date +%Y%m%dT%H%M%S).txt}"

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

DISPOSABLE_DIR=""
DISPOSABLE_ID=""
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

cleanup() {
  if [[ "${CLEANUP_DONE}" -eq 1 ]]; then
    return 0
  fi
  CLEANUP_DONE=1
  section "Cleanup (exact commands)"

  if [[ -n "${DISPOSABLE_ID}" ]]; then
    log "docker compose -f ${REPO_ROOT}/compose.yaml exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -c \"DELETE FROM projects WHERE id = '${DISPOSABLE_ID}';\""
  else
    log "# No disposable project id recorded; skip DB delete"
  fi

  if [[ -n "${DISPOSABLE_DIR}" ]]; then
    log "rm -rf -- ${DISPOSABLE_DIR}"
  else
    log "# No disposable directory recorded; skip filesystem delete"
  fi

  if [[ -n "${DISPOSABLE_ID}" ]]; then
    (
      cd "${REPO_ROOT}"
      docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 \
        -c "DELETE FROM projects WHERE id = '${DISPOSABLE_ID}';"
    )
    log "Executed DB delete for project id=${DISPOSABLE_ID}"
  fi

  if [[ -n "${DISPOSABLE_DIR}" && -e "${DISPOSABLE_DIR}" ]]; then
    rm -rf -- "${DISPOSABLE_DIR}"
    log "Executed rm -rf for disposable directory"
  fi

  if [[ -n "${DISPOSABLE_ID}" ]]; then
    http_json GET "${API_BASE}/projects/${DISPOSABLE_ID}"
    if [[ "${HTTP_STATUS}" == "404" ]]; then
      pass "disposable project GET returns 404 after cleanup"
    else
      fail "disposable project GET expected 404, got ${HTTP_STATUS}" || true
    fi
    rm -f "${BODY_FILE}"
  fi

  if [[ -n "${DISPOSABLE_DIR}" ]]; then
    if [[ ! -e "${DISPOSABLE_DIR}" ]]; then
      pass "disposable directory no longer exists"
    else
      fail "disposable directory still exists: ${DISPOSABLE_DIR}" || true
    fi
  fi

  log "Cleanup finished (no volume reset; axioma-db-dev untouched)."
}

trap cleanup EXIT

: >"${REPORT}"
section "w02-s01 operator human validation"
log "API_BASE=${API_BASE}"
log "HOST_REPOS_ROOT=${SPECPILOT_HOST_REPOS_ROOT}"
log "REPORT=${REPORT}"
log "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---------------------------------------------------------------------------
# Scenario 1 — success against registered SpecPilot project
# ---------------------------------------------------------------------------
section "Scenario 1: success (spec-pilot / planning)"

http_json GET "${API_BASE}/projects"
assert_eq "GET /projects HTTP" "200" "${HTTP_STATUS}"
LIST_BODY="${BODY_FILE}"

PROJECT_ID="$(
  python3 - "${LIST_BODY}" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
match = next((r for r in rows if r.get("slug") == "spec-pilot"), None)
if not match:
    raise SystemExit("spec-pilot project not found in GET /projects")
print(match["id"])
PY
)"
log "spec-pilot project id=${PROJECT_ID}"
rm -f "${LIST_BODY}"

REQ1="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ1}"
http_json POST "${API_BASE}/projects/${PROJECT_ID}/context-sources/resolve" "${REQ1}"
rm -f "${REQ1}"
S1_BODY="${BODY_FILE}"
assert_eq "scenario1 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S1_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys, os, subprocess

body = json.load(open(sys.argv[1]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

check(body.get("status") == "ok", f"status={body.get('status')!r} want ok")
check(body.get("stage") == "planning", f"stage={body.get('stage')!r} want planning")
check(isinstance(body.get("configurationVersionId"), str) and bool(body["configurationVersionId"]), "configurationVersionId missing")
check(isinstance(body.get("sourceHash"), str) and bool(body["sourceHash"]), "sourceHash missing")
paths = body.get("paths")
check(isinstance(paths, list), "paths is not a list")
check(body.get("pathCount") == len(paths), f"pathCount={body.get('pathCount')} != len(paths)={len(paths) if isinstance(paths, list) else 'n/a'}")

if isinstance(paths, list):
    check(paths == sorted(paths), "paths are not deterministically sorted (a < b)")
    for p in paths:
        check(isinstance(p, str), f"non-string path: {p!r}")
        check(not p.startswith("/"), f"absolute path: {p}")
        check(not p.startswith("./"), f"leading ./ path: {p}")
        check("\\" not in p, f"backslash in path: {p}")
        check(".." not in p.split("/"), f".. segment in path: {p}")

repo_root = os.environ.get("REPO_ROOT", "")
script = r'''
const pm = require("picomatch");
const patterns = ["**/.env","**/.env.*","**/*.pem","**/*.key","**/secrets/**"];
const paths = JSON.parse(process.argv[1]);
const opts = {dot:true, nocase:false, nonegate:true};
const hit = [];
for (const p of paths) {
  for (const pat of patterns) {
    if (pm(pat, opts)(p)) hit.push([p, pat]);
  }
}
if (hit.length) {
  console.error(JSON.stringify(hit));
  process.exit(2);
}
console.log("no secret-path matches");
'''
proc = subprocess.run(
    ["node", "-e", script, json.dumps(paths if isinstance(paths, list) else [])],
    cwd=repo_root or None,
    capture_output=True,
    text=True,
)
if proc.returncode != 0:
    errors.append(f"secret-path matches found: {proc.stderr.strip() or proc.stdout.strip()}")
else:
    print("PASS: no returned paths match mandatory secret excludes")

forbidden = ["content", "contents", "fileContent", "bytes", "text", "payload"]
for key in forbidden:
    check(key not in body, f"unexpected content field present: {key}")

if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario1 JSON contract assertions")
print(f"INFO: pathCount={body.get('pathCount')}")
PY
rm -f "${S1_BODY}"

# ---------------------------------------------------------------------------
# Scenario 2 — empty success via disposable registered project
# ---------------------------------------------------------------------------
section "Scenario 2: empty success (disposable project)"

STAMP="$(date +%Y%m%dT%H%M%S)-$$"
DISPOSABLE_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s01-empty-${STAMP}"
mkdir -p "${DISPOSABLE_DIR}/.specpilot"
log "Created disposable repo: ${DISPOSABLE_DIR}"

cat >"${DISPOSABLE_DIR}/.specpilot/project.yaml" <<'YAML'
schemaVersion: 1
project:
  id: sp-w02-s01-empty
  name: W02 S01 Empty Fixture
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
    - __w02_s01_never_matches__/**
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

REG_REQ="$(mktemp)"
python3 - "${DISPOSABLE_DIR}" "${REG_REQ}" <<'PY'
import json, sys
json.dump(
    {"repositoryPath": sys.argv[1], "displayName": "w02-s01-empty-fixture"},
    open(sys.argv[2], "w"),
)
PY

http_json POST "${API_BASE}/projects" "${REG_REQ}"
rm -f "${REG_REQ}"
REG_BODY="${BODY_FILE}"
assert_eq "register disposable HTTP" "201" "${HTTP_STATUS}"

DISPOSABLE_ID="$(
  python3 - "${REG_BODY}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
cfg = body.get("configuration") or {}
if cfg.get("status") != "attached":
    raise SystemExit(f"expected attached configuration, got: {cfg!r}")
print(body["id"])
PY
)"
log "disposable project id=${DISPOSABLE_ID}"
rm -f "${REG_BODY}"

REQ2="$(mktemp)"
printf '%s\n' '{"stage":"planning"}' >"${REQ2}"
http_json POST "${API_BASE}/projects/${DISPOSABLE_ID}/context-sources/resolve" "${REQ2}"
rm -f "${REQ2}"
S2_BODY="${BODY_FILE}"
assert_eq "scenario2 HTTP" "200" "${HTTP_STATUS}"

python3 - "${S2_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []
if body.get("status") != "ok":
    errors.append(f"status={body.get('status')!r} want ok (empty success, not blocked)")
if body.get("pathCount") != 0:
    errors.append(f"pathCount={body.get('pathCount')!r} want 0")
if body.get("paths") != []:
    errors.append(f"paths={body.get('paths')!r} want []")
if body.get("status") == "blocked":
    errors.append("presented as blocked; want empty success")
if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario2 empty success (ok, pathCount=0, paths=[])")
PY
rm -f "${S2_BODY}"

# ---------------------------------------------------------------------------
# Scenario 3 — blocked contract (invalid stage)
# ---------------------------------------------------------------------------
section "Scenario 3: blocked invalid_review_stage"

REQ3="$(mktemp)"
printf '%s\n' '{"stage":"deploy"}' >"${REQ3}"
http_json POST "${API_BASE}/projects/${DISPOSABLE_ID}/context-sources/resolve" "${REQ3}"
rm -f "${REQ3}"
S3_BODY="${BODY_FILE}"
assert_eq "scenario3 HTTP" "422" "${HTTP_STATUS}"

python3 - "${S3_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
errors = []
if body.get("status") != "blocked":
    errors.append(f"status={body.get('status')!r} want blocked")
if body.get("code") != "invalid_review_stage":
    errors.append(f"code={body.get('code')!r} want invalid_review_stage")
if body.get("stage") is not None:
    errors.append(f"stage={body.get('stage')!r} want null")
if "paths" in body:
    errors.append("partial paths present on blocked response")
if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: scenario3 blocked invalid_review_stage (no partial paths)")
PY
rm -f "${S3_BODY}"

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
    log "Report copied to clipboard via pbcopy"
  fi
  log "Report path: ${REPORT}"
  exit 1
fi
log "RESULT=PASS (scenarios complete; cleanup follows via trap)"

if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"${REPORT}"
  log "Report copied to clipboard via pbcopy"
else
  log "pbcopy not available; report is at ${REPORT}"
fi

log "Report path: ${REPORT}"
exit 0
