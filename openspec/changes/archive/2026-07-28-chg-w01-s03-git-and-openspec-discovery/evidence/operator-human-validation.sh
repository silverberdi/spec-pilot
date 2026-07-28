#!/usr/bin/env bash
# Operator human-validation for chg-w01-s03-git-and-openspec-discovery (task 10.1).
# Run from any directory. Does not modify SpecPilot source.
# Prerequisites: SpecPilot Compose api/web rebuilt with w01-s03; migrate deploy applied;
# SPECPILOT_HOST_REPOS_ROOT set (same absolute path as compose.override mount).
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
REPORT="/tmp/sp-hv-w01s03-discovery-$(date +%Y%m%dT%H%M%S).txt"
SPECPILOT_REPO="${SPECPILOT_REPO:-/Users/silveriobernal/Documents/Code/Development/spec-pilot}"

# Load host root from SpecPilot .env if present (gitignored).
if [[ -z "${SPECPILOT_HOST_REPOS_ROOT:-}" && -f "${SPECPILOT_REPO}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck disable=SC1090
  source "${SPECPILOT_REPO}/.env"
  set +a
fi

: "${SPECPILOT_HOST_REPOS_ROOT:?Set SPECPILOT_HOST_REPOS_ROOT to the authorized absolute host root}"

TS="$(date +%Y%m%dT%H%M%S)"
DISP_NAME="sp-hv-w01s03-${TS}"
DISP_DIR="${SPECPILOT_HOST_REPOS_ROOT}/${DISP_NAME}"
DISP_PROJECT_ID=""
CLEANED=0

log() { printf '%s\n' "$*" | tee -a "$REPORT"; }

http_json() {
  # usage: http_json METHOD URL [BODY]
  local method="$1" url="$2" body="${3:-}"
  local tmp status
  tmp="$(mktemp)"
  if [[ -n "$body" ]]; then
    status="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" \
      -H 'Content-Type: application/json' \
      --data "$body" "$url")"
  else
    status="$(curl -sS -o "$tmp" -w '%{http_code}' -X "$method" "$url")"
  fi
  HTTP_STATUS="$status"
  HTTP_BODY="$(cat "$tmp")"
  rm -f "$tmp"
}

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" != "$actual" ]]; then
    log "ASSERT FAIL: ${label}: expected='${expected}' actual='${actual}'"
    log "Body: ${HTTP_BODY}"
    exit 1
  fi
  log "ASSERT OK: ${label}=${actual}"
}

json_field() {
  # usage: json_field JSON PATH_EXPR (python)
  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(eval(sys.argv[2], {"d": d}))' "$1" "$2"
}

show_cleanup_plan() {
  log "---- CLEANUP PLAN (exact) ----"
  log "1) DELETE FROM projects WHERE id = '${DISP_PROJECT_ID:-<pending>}'  (cascade removes ProjectConfigurationVersion rows)"
  log "    via: docker exec specpilot-postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -c \"DELETE FROM projects WHERE id = '${DISP_PROJECT_ID:-<pending>}';\""
  log "2) rm -rf '${DISP_DIR}'  (only this disposable directory)"
  log "Does NOT: reset DB, remove volumes, touch other projects, or touch axioma-db-dev."
  log "---- END CLEANUP PLAN ----"
}

cleanup() {
  local ec=$?
  if [[ "$CLEANED" -eq 1 ]]; then
    return 0
  fi
  CLEANED=1
  log ""
  log "=== CLEANUP (trap; exit_code=${ec}) ==="
  show_cleanup_plan
  if [[ -n "${DISP_PROJECT_ID}" ]]; then
    log "Executing DB delete for id=${DISP_PROJECT_ID}…"
    docker exec specpilot-postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 \
      -c "DELETE FROM projects WHERE id = '${DISP_PROJECT_ID}';" | tee -a "$REPORT"
  else
    log "No disposable project id recorded; skipping DB delete."
  fi
  if [[ -d "${DISP_DIR}" ]]; then
    log "Removing disposable directory ${DISP_DIR}…"
    rm -rf "${DISP_DIR}"
  fi
  # Verify gone
  if [[ -n "${DISP_PROJECT_ID}" ]]; then
    http_json GET "${API_BASE}/projects/${DISP_PROJECT_ID}"
    if [[ "$HTTP_STATUS" != "404" ]]; then
      log "VERIFY FAIL: disposable project still visible (HTTP ${HTTP_STATUS})"
      exit 1
    fi
    log "VERIFY OK: disposable project GET => 404"
  fi
  if [[ -e "${DISP_DIR}" ]]; then
    log "VERIFY FAIL: disposable directory still exists: ${DISP_DIR}"
    exit 1
  fi
  log "VERIFY OK: disposable directory removed"
  log "Report: ${REPORT}"
  if command -v pbcopy >/dev/null 2>&1; then
    pbcopy < "$REPORT"
    log "Report copied to clipboard via pbcopy."
  fi
  exit "$ec"
}

trap cleanup EXIT

: >"$REPORT"
log "SpecPilot w01-s03 human validation report"
log "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "API_BASE=${API_BASE}"
log "SPECPILOT_HOST_REPOS_ROOT=${SPECPILOT_HOST_REPOS_ROOT}"
log "SPECPILOT_REPO=${SPECPILOT_REPO}"
log "DISP_DIR=${DISP_DIR}"
log ""

# Sanity: discovery route exists (fresh image)
http_json GET "${API_BASE}/health"
assert_eq "health" "200" "$HTTP_STATUS"

# ---------------------------------------------------------------------------
# Scenario 1 — success path on registered SpecPilot repository
# ---------------------------------------------------------------------------
log "=== Scenario 1: SpecPilot success path ==="
http_json GET "${API_BASE}/projects"
assert_eq "list projects" "200" "$HTTP_STATUS"
SPEC_ID="$(python3 -c '
import json,sys
ps=json.loads(sys.argv[1])
target=sys.argv[2].rstrip("/")
for p in ps:
  if p.get("repositoryPath","").rstrip("/") == target:
    print(p["id"]); break
else:
  raise SystemExit("SpecPilot project not registered at "+target)
' "$HTTP_BODY" "$SPECPILOT_REPO")"
log "SpecPilot project id=${SPEC_ID}"

http_json GET "${API_BASE}/projects/${SPEC_ID}/discovery"
log "GET discovery before refresh (may be 404 discovery_not_found or 200 snapshot): HTTP ${HTTP_STATUS}"
if [[ "$HTTP_STATUS" != "404" && "$HTTP_STATUS" != "200" ]]; then
  log "Unexpected GET discovery status ${HTTP_STATUS}: ${HTTP_BODY}"
  exit 1
fi
if [[ "$HTTP_STATUS" == "404" ]]; then
  CODE="$(json_field "$HTTP_BODY" "d['code']")"
  assert_eq "pre-refresh discovery code" "discovery_not_found" "$CODE"
fi

http_json POST "${API_BASE}/projects/${SPEC_ID}/discovery/refresh"
assert_eq "refresh SpecPilot discovery" "200" "$HTTP_STATUS"
GIT_STATUS="$(json_field "$HTTP_BODY" "d['git']['status']")"
OS_STATUS="$(json_field "$HTTP_BODY" "d['openspec']['status']")"
assert_eq "git.status" "ok" "$GIT_STATUS"
assert_eq "openspec.status" "ok" "$OS_STATUS"
BRANCH="$(json_field "$HTTP_BODY" "d['git'].get('branch')")"
HEAD="$(json_field "$HTTP_BODY" "d['git'].get('headSha')")"
DIRTY="$(json_field "$HTTP_BODY" "d['git'].get('dirty')")"
ACTIVE="$(json_field "$HTTP_BODY" "len(d['openspec']['activeChanges'])")"
ARCHIVED="$(json_field "$HTTP_BODY" "d['openspec']['archivedChangeCount']")"
log "git branch=${BRANCH} headSha=${HEAD:0:12}… dirty=${DIRTY}"
log "openspec activeChanges=${ACTIVE} archivedChangeCount=${ARCHIVED}"
if [[ -z "$HEAD" || "$HEAD" == "None" ]]; then
  log "ASSERT FAIL: expected non-null headSha on SpecPilot repo"
  exit 1
fi
if [[ "$ACTIVE" -lt 1 ]]; then
  log "ASSERT FAIL: expected at least one active OpenSpec change"
  exit 1
fi
# Artifact presence sample
HAS_PROP="$(json_field "$HTTP_BODY" "any(c.get('hasProposal') for c in d['openspec']['activeChanges'])")"
log "any hasProposal=${HAS_PROP}"

INSPECTED="$(json_field "$HTTP_BODY" "d['inspectedAt']")"
http_json GET "${API_BASE}/projects/${SPEC_ID}/discovery"
assert_eq "GET persisted discovery" "200" "$HTTP_STATUS"
GOT_INSPECTED="$(json_field "$HTTP_BODY" "d['inspectedAt']")"
assert_eq "persisted inspectedAt" "$INSPECTED" "$GOT_INSPECTED"

http_json GET "${API_BASE}/projects/${SPEC_ID}"
assert_eq "GET project detail" "200" "$HTTP_STATUS"
LAST="$(json_field "$HTTP_BODY" "d['lastInspectedAt']")"
if [[ -z "$LAST" || "$LAST" == "None" ]]; then
  log "ASSERT FAIL: lastInspectedAt still null"
  exit 1
fi
log "lastInspectedAt=${LAST}"

# ---------------------------------------------------------------------------
# Scenario 2 — get-before-refresh on disposable registered project
# ---------------------------------------------------------------------------
log ""
log "=== Scenario 2: disposable get-before-refresh ==="
mkdir -p "${DISP_DIR}/.specpilot"
cat >"${DISP_DIR}/.specpilot/project.yaml" <<YAML
schemaVersion: 1
project:
  id: ${DISP_NAME}
  name: HV Disposable
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
    - AGENTS.md
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

http_json POST "${API_BASE}/projects" "{\"repositoryPath\":\"${DISP_DIR}\",\"displayName\":\"HV Disposable ${TS}\"}"
assert_eq "register disposable" "201" "$HTTP_STATUS"
DISP_PROJECT_ID="$(json_field "$HTTP_BODY" "d['id']")"
LAST0="$(json_field "$HTTP_BODY" "d['lastInspectedAt']")"
if [[ "$LAST0" != "None" && -n "$LAST0" ]]; then
  # JSON null becomes None in python print
  :
fi
python3 -c 'import json,sys; d=json.loads(sys.argv[1]);
assert d["lastInspectedAt"] is None, d["lastInspectedAt"]
print("lastInspectedAt is null on register OK")' "$HTTP_BODY" | tee -a "$REPORT"
log "Disposable project id=${DISP_PROJECT_ID}"

http_json GET "${API_BASE}/projects/${DISP_PROJECT_ID}/discovery"
assert_eq "GET discovery before refresh" "404" "$HTTP_STATUS"
CODE="$(json_field "$HTTP_BODY" "d['code']")"
assert_eq "discovery_not_found" "discovery_not_found" "$CODE"

# ---------------------------------------------------------------------------
# Scenario 3 — completed blocked discovery cycle (no git, no openspec/)
# ---------------------------------------------------------------------------
log ""
log "=== Scenario 3: blocked discovery cycle ==="
# Ensure no .git and no openspec root (only .specpilot exists)
if [[ -e "${DISP_DIR}/.git" || -e "${DISP_DIR}/openspec" ]]; then
  log "ASSERT FAIL: disposable tree unexpectedly has .git or openspec"
  exit 1
fi

http_json POST "${API_BASE}/projects/${DISP_PROJECT_ID}/discovery/refresh"
assert_eq "blocked refresh HTTP" "200" "$HTTP_STATUS"
GIT_STATUS="$(json_field "$HTTP_BODY" "d['git']['status']")"
GIT_CODE="$(json_field "$HTTP_BODY" "d['git']['code']")"
OS_STATUS="$(json_field "$HTTP_BODY" "d['openspec']['status']")"
OS_CODE="$(json_field "$HTTP_BODY" "d['openspec']['code']")"
assert_eq "git.status" "blocked" "$GIT_STATUS"
assert_eq "git.code" "not_a_git_repository" "$GIT_CODE"
assert_eq "openspec.status" "blocked" "$OS_STATUS"
assert_eq "openspec.code" "openspec_root_missing" "$OS_CODE"
BLOCK_INSPECTED="$(json_field "$HTTP_BODY" "d['inspectedAt']")"

http_json GET "${API_BASE}/projects/${DISP_PROJECT_ID}/discovery"
assert_eq "GET blocked snapshot" "200" "$HTTP_STATUS"
assert_eq "persisted git.code" "not_a_git_repository" "$(json_field "$HTTP_BODY" "d['git']['code']")"
assert_eq "persisted openspec.code" "openspec_root_missing" "$(json_field "$HTTP_BODY" "d['openspec']['code']")"
assert_eq "persisted inspectedAt" "$BLOCK_INSPECTED" "$(json_field "$HTTP_BODY" "d['inspectedAt']")"

http_json GET "${API_BASE}/projects/${DISP_PROJECT_ID}"
assert_eq "GET disposable detail" "200" "$HTTP_STATUS"
LAST1="$(json_field "$HTTP_BODY" "d['lastInspectedAt']")"
if [[ -z "$LAST1" || "$LAST1" == "None" ]]; then
  log "ASSERT FAIL: disposable lastInspectedAt still null after blocked refresh"
  exit 1
fi
log "disposable lastInspectedAt=${LAST1}"

log ""
log "ALL ASSERTIONS PASSED"
log "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
# trap cleanup runs on exit 0
exit 0
