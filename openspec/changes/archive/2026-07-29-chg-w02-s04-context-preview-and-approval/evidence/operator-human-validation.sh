#!/usr/bin/env bash
# Operator human-validation script for chg-w02-s04-context-preview-and-approval.
# Validates the deployed runtime (not only automated tests).
# Disposable projects only. Runtime-built fixtures. Sanitized report (no excerpts).
# Does not mark task 10.1 complete. Does not Verify/sync/archive/commit/push.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO_ROOT
REPORT="${REPORT_PATH:-/tmp/sp-w02-s04-operator-validation-$(date +%Y%m%dT%H%M%S).txt}"

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
  local sql="$1"
  (
    cd "${REPO_ROOT}"
    docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -t -A -c "${sql}"
  )
}

sql_exec() {
  local sql="$1"
  (
    cd "${REPO_ROOT}"
    docker compose exec -T postgres psql -U specpilot -d specpilot -v ON_ERROR_STOP=1 -c "${sql}"
  )
}

create_clean_fixture_repo() {
  local dest="$1"
  local project_yaml_id="$2"
  local display="$3"
  mkdir -p "${dest}/.specpilot" "${dest}/docs"
  track_dir "${dest}"
  write_project_yaml "${dest}/.specpilot/project.yaml" "${project_yaml_id}" "${display}"
  # Multi-line LF file
  printf '%s\n' 'line-one ordinary text' 'line-two ordinary text' 'line-three ordinary text' >"${dest}/docs/multi.md"
  # Unicode file (code-point vs byte divergence)
  python3 - "${dest}/docs/unicode.md" <<'PY'
import sys
text = ("\U0001F600" * 5) + "Z"
open(sys.argv[1], "w", encoding="utf-8", newline="\n").write(text + "\n")
PY
  # CRLF fixture — preserve exact CRLF bytes
  python3 - "${dest}/docs/crlf.md" <<'PY'
import sys
open(sys.argv[1], "wb").write(b"alpha\r\nbravo\r\ncharlie\r\n")
PY
}

create_bundle_planning() {
  local project_id="$1"
  local req
  req="$(mktemp)"
  printf '%s\n' '{"stage":"planning"}' >"${req}"
  http_json POST "${API_BASE}/projects/${project_id}/context-bundles" "${req}"
  rm -f "${req}"
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

    local left_b left_s left_a
    left_b="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${id}';" | tr -d '[:space:]')"
    left_s="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${id}';" | tr -d '[:space:]')"
    left_a="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${id}';" | tr -d '[:space:]')"
    if [[ "${left_b}" == "0" && "${left_s}" == "0" && "${left_a}" == "0" ]]; then
      pass "no bundles/sessions/approvals remain for project ${id}"
    else
      fail "leftover rows for ${id}: bundles=${left_b} sessions=${left_s} approvals=${left_a}" || true
    fi
  done

  for d in "${DISPOSABLE_DIRS[@]+"${DISPOSABLE_DIRS[@]}"}"; do
    if [[ ! -e "${d}" ]]; then
      pass "disposable directory no longer exists (${d})"
    else
      fail "disposable directory still exists: ${d}" || true
    fi
  done

  if [[ -n "${EXISTING_PROJECT_COUNT_BEFORE:-}" ]]; then
    local after_count
    after_count="$(sql_ro "SELECT COUNT(*) FROM projects;" | tr -d '[:space:]')"
    if [[ "${after_count}" == "${EXISTING_PROJECT_COUNT_BEFORE}" ]]; then
      pass "project count restored (${after_count})"
    else
      fail "project count not restored: before=${EXISTING_PROJECT_COUNT_BEFORE} after=${after_count}" || true
    fi
  fi

  log "Cleanup finished (no volume reset; axioma-db-dev untouched)."
}

trap cleanup EXIT

: >"${REPORT}"
section "w02-s04 operator human validation"
log "API_BASE=${API_BASE}"
log "HOST_REPOS_ROOT=${SPECPILOT_HOST_REPOS_ROOT}"
log "REPORT=${REPORT}"
log "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---------------------------------------------------------------------------
# 1. Runtime freshness
# ---------------------------------------------------------------------------
section "1. Runtime freshness"
http_json GET "${API_BASE}/health"
assert_eq "GET /health HTTP" "200" "${HTTP_STATUS}"
rm -f "${BODY_FILE}"

FAKE_PID="00000000-0000-4000-8000-0000000000aa"
FAKE_BID="00000000-0000-4000-8000-0000000000bb"

http_json POST "${API_BASE}/projects/${FAKE_PID}/context-bundles/${FAKE_BID}/preview" <(printf '{}')
if [[ "${HTTP_STATUS}" == "404" ]]; then
  if python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
raise SystemExit(0 if body.get("code") == "project_not_found" else 1)
PY
  then
    pass "preview route is live (project_not_found)"
  else
    fail "preview route appears missing/stale (body not project_not_found)"
  fi
else
  fail "preview freshness unexpected HTTP ${HTTP_STATUS}"
fi
rm -f "${BODY_FILE}"

http_json GET "${API_BASE}/projects/${FAKE_PID}/context-bundles/${FAKE_BID}/disclosure-status"
if [[ "${HTTP_STATUS}" == "404" ]]; then
  if python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
raise SystemExit(0 if body.get("code") == "project_not_found" else 1)
PY
  then
    pass "disclosure-status route is live (project_not_found)"
  else
    fail "disclosure-status route appears missing/stale"
  fi
else
  fail "disclosure-status freshness unexpected HTTP ${HTTP_STATUS}"
fi
rm -f "${BODY_FILE}"

http_json GET "${API_BASE}/projects/${FAKE_PID}/disclosure-approvals?stage=planning&limit=1"
if [[ "${HTTP_STATUS}" == "404" ]]; then
  if python3 - "${BODY_FILE}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
raise SystemExit(0 if body.get("code") == "project_not_found" else 1)
PY
  then
    pass "disclosure-approvals route is live (project_not_found)"
  else
    fail "disclosure-approvals route appears missing/stale"
  fi
else
  fail "disclosure-approvals freshness unexpected HTTP ${HTTP_STATUS}"
fi
rm -f "${BODY_FILE}"

TBL_SESS="$(sql_ro "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='context_disclosure_preview_sessions';" | tr -d '[:space:]')"
TBL_APPR="$(sql_ro "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='context_disclosure_approvals';" | tr -d '[:space:]')"
assert_eq "table context_disclosure_preview_sessions exists" "1" "${TBL_SESS}"
assert_eq "table context_disclosure_approvals exists" "1" "${TBL_APPR}"

FORBIDDEN_COLS="$(sql_ro "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='context_bundles' AND column_name IN ('content_transmitted','approval','decision','preview_session_id','approved_at','disclosure_approval_id');" | tr -d '[:space:]')"
assert_eq "ContextBundle has no approval/decision/preview/transmission columns" "0" "${FORBIDDEN_COLS}"

EXISTING_PROJECT_COUNT_BEFORE="$(sql_ro "SELECT COUNT(*) FROM projects;" | tr -d '[:space:]')"
log "INFO: projects count before disposable work=${EXISTING_PROJECT_COUNT_BEFORE}"

STAMP="$(date +%Y%m%dT%H%M%S)-$$"

# ---------------------------------------------------------------------------
# 2. Clean bundle setup
# ---------------------------------------------------------------------------
section "2. Clean bundle setup"
CLEAN_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s04-clean-${STAMP}"
create_clean_fixture_repo "${CLEAN_DIR}" "sp-w02-s04-clean" "W02 S04 Clean Fixture"
register_project "${CLEAN_DIR}" "w02-s04-clean-fixture"
CLEAN_ID="${REGISTERED_PROJECT_ID}"
track_id "${CLEAN_ID}"
log "clean project id=${CLEAN_ID}"

create_bundle_planning "${CLEAN_ID}"
S2_BODY="${BODY_FILE}"
assert_eq "bundle create HTTP" "201" "${HTTP_STATUS}"

S2_ASSERT_LOG="$(mktemp)"
BUNDLE1_ID="$(
  python3 - "${S2_BODY}" "${CLEAN_DIR}" "${CLEAN_ID}" 2>"${S2_ASSERT_LOG}" <<'PY'
import hashlib, json, sys
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

check(body.get("status") == "ok", f"status={body.get('status')!r}")
check(isinstance(body.get("id"), str) and body["id"], "id missing")
check(body.get("projectId") == project_id, "projectId mismatch")
check(body.get("stage") == "planning", "stage mismatch")
check(isinstance(body.get("entryCount"), int) and body["entryCount"] >= 2, "entryCount < 2")
mh = body.get("manifestHash")
check(isinstance(mh, str) and len(mh) == 64 and mh == mh.lower() and all(c in "0123456789abcdef" for c in mh), "manifestHash invalid")
check("contentTransmitted" not in body, "contentTransmitted must be absent")
entries = body.get("entries") or []
paths = {e.get("path") for e in entries if isinstance(e, dict)}
for rel in ("docs/multi.md", "docs/unicode.md", "docs/crlf.md"):
    check(rel in paths, f"missing entry {rel}")
    e = next(x for x in entries if x.get("path") == rel)
    raw = (repo / rel).read_bytes()
    check(e.get("contentHash") == sha256_hex(raw), f"{rel} contentHash mismatch")

if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    raise SystemExit(1)
print("PASS: clean bundle create contract", file=sys.stderr)
print(body["id"], end="")
PY
)"
tee -a "${REPORT}" <"${S2_ASSERT_LOG}" >/dev/null
cat "${S2_ASSERT_LOG}" >&2 || true
rm -f "${S2_ASSERT_LOG}"
BUNDLE1_MANIFEST_HASH="$(python3 - "${S2_BODY}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["manifestHash"])
PY
)"
BUNDLE1_SNAPSHOT="$(mktemp)"
cp "${S2_BODY}" "${BUNDLE1_SNAPSHOT}"
rm -f "${S2_BODY}"
pass "clean bundle created (id=${BUNDLE1_ID})"

# ---------------------------------------------------------------------------
# 3. Initial disclosure status
# ---------------------------------------------------------------------------
section "3. Initial disclosure status"
http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/disclosure-status"
S3_BODY="${BODY_FILE}"
assert_eq "initial status HTTP" "200" "${HTTP_STATUS}"
python3 - "${S3_BODY}" "${CLEAN_ID}" "${BUNDLE1_ID}" "${BUNDLE1_MANIFEST_HASH}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
project_id, bundle_id, mh = sys.argv[2], sys.argv[3], sys.argv[4]
errors = []
def check(cond, msg):
    if not cond: errors.append(msg)
check(body.get("status") == "ok", "status")
check(body.get("projectId") == project_id, "projectId")
check(body.get("contextBundleId") == bundle_id, "contextBundleId")
check(body.get("manifestHash") == mh, "manifestHash")
check(body.get("stage") == "planning", "stage")
check(body.get("approvalRequired") is True, "approvalRequired")
check(body.get("coveringApprovalId") is None, "coveringApprovalId")
check(body.get("previewPolicyId") == "bounded-selected-text-v1", "previewPolicyId")
check(body.get("approvalPolicyId") == "explicit-disclosure-approval-v1", "approvalPolicyId")
check(body.get("contentTransmitted") is False, "contentTransmitted")
if errors:
    for e in errors: print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: initial disclosure-status first-run")
PY
rm -f "${S3_BODY}"

# ---------------------------------------------------------------------------
# 4. Preview success
# ---------------------------------------------------------------------------
section "4. Preview success"
SESSIONS_BEFORE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/preview" <(printf '{}')
S4_BODY="${BODY_FILE}"
assert_eq "preview HTTP" "200" "${HTTP_STATUS}"

S4_ASSERT_LOG="$(mktemp)"
PREVIEW_SESSION_ID="$(
  python3 - "${S4_BODY}" "${CLEAN_DIR}" "${CLEAN_ID}" "${BUNDLE1_ID}" "${BUNDLE1_MANIFEST_HASH}" "${BUNDLE1_SNAPSHOT}" 2>"${S4_ASSERT_LOG}" <<'PY'
import hashlib, json, sys
from datetime import datetime, timezone
from pathlib import Path

body = json.load(open(sys.argv[1]))
repo = Path(sys.argv[2])
project_id, bundle_id, mh = sys.argv[3], sys.argv[4], sys.argv[5]
bundle = json.load(open(sys.argv[6]))
errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def extract_excerpt(text: str, line_ranges, byte_length: int) -> str:
    if byte_length == 0:
        if len(line_ranges) != 0:
            raise ValueError("empty file expects empty ranges")
        return ""
    lines = text.split("\n")
    line_count = len(lines)
    if (
        len(line_ranges) == 1
        and line_ranges[0]["startLine"] == 1
        and line_ranges[0]["endLine"] == line_count
    ):
        return text
    segments = [
        "\n".join(lines[r["startLine"] - 1 : r["endLine"]]) for r in line_ranges
    ]
    return "\n".join(segments)

def preview_integrity_hash(project_id, bundle_id, manifest_hash, items):
    obj = {
        "previewPolicyId": "bounded-selected-text-v1",
        "projectId": project_id,
        "contextBundleId": bundle_id,
        "manifestHash": manifest_hash,
        "items": [
            {
                "path": it["path"],
                "contentHash": it["contentHash"],
                "lineRanges": [
                    {"startLine": r["startLine"], "endLine": r["endLine"]}
                    for r in it["lineRanges"]
                ],
                "excerptHash": sha256_hex(it["excerpt"].encode("utf-8")),
            }
            for it in items
        ],
    }
    return sha256_hex(json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))

check(body.get("status") == "ok", "status")
sid = body.get("previewSessionId")
check(isinstance(sid, str) and sid, "previewSessionId")
check(body.get("previewPolicyId") == "bounded-selected-text-v1", "previewPolicyId")
check(body.get("approvalPolicyId") == "explicit-disclosure-approval-v1", "approvalPolicyId")
pih = body.get("previewIntegrityHash")
check(isinstance(pih, str) and len(pih) == 64 and pih == pih.lower(), "previewIntegrityHash shape")
check(body.get("approvalRequired") is True, "approvalRequired")
items = body.get("items")
check(isinstance(items, list), "items")
check(body.get("itemCount") == len(items), "itemCount")
check(body.get("manifestHash") == mh, "manifestHash")
check("contentTransmitted" not in body, "no contentTransmitted on preview")

created = datetime.fromisoformat(body["createdAt"].replace("Z", "+00:00"))
expires = datetime.fromisoformat(body["expiresAt"].replace("Z", "+00:00"))
delta = (expires - created).total_seconds()
check(abs(delta - 900) <= 2, f"TTL delta={delta}")

bundle_by_path = {e["path"]: e for e in bundle["entries"]}
rebuilt = []
for it in items:
    path = it.get("path")
    check(isinstance(path, str) and not path.startswith("/") and not path.startswith("./"), f"bad path {path!r}")
    ch = it.get("contentHash")
    check(isinstance(ch, str) and len(ch) == 64 and ch == ch.lower(), f"contentHash shape {path}")
    raw = (repo / path).read_bytes()
    check(ch == sha256_hex(raw), f"live contentHash mismatch {path}")
    text = raw.decode("utf-8")
    ranges = it.get("lineRanges")
    expected_excerpt = extract_excerpt(text, ranges, len(raw))
    check(it.get("excerpt") == expected_excerpt, f"excerpt mismatch for {path}")
    if path == "docs/crlf.md":
        check(b"\r\n" in raw, "fixture missing CRLF bytes")
        check("\r\n" in it["excerpt"], "CRLF was normalized away")
        check(it["excerpt"] == raw.decode("utf-8"), "CRLF excerpt not exact decoded text")
    if path == "docs/unicode.md":
        check(it["excerpt"] == raw.decode("utf-8"), "unicode excerpt not exact")
    check(path in bundle_by_path, f"path not in bundle {path}")
    check(ranges == bundle_by_path[path]["lineRanges"], f"lineRanges drift {path}")
    rebuilt.append({
        "path": path,
        "contentHash": ch,
        "lineRanges": ranges,
        "excerpt": it["excerpt"],
    })

calc = preview_integrity_hash(project_id, bundle_id, mh, rebuilt)
check(calc == pih, "previewIntegrityHash independent recalculation mismatch")

raw_json = open(sys.argv[1], encoding="utf-8").read()
for needle in ("/Users/", "matchedValue", "detectorId", "stack", "SPECPILOT_HOST"):
    check(needle not in raw_json, f"leaked {needle!r}")

if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    raise SystemExit(1)
print("PASS: preview success + independent integrity checks", file=sys.stderr)
print(sid, end="")
PY
)"
tee -a "${REPORT}" <"${S4_ASSERT_LOG}" >/dev/null
cat "${S4_ASSERT_LOG}" >&2 || true
rm -f "${S4_ASSERT_LOG}"
PREVIEW_INTEGRITY_HASH="$(python3 - "${S4_BODY}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["previewIntegrityHash"])
PY
)"
S4_KEEP="$(mktemp)"
cp "${S4_BODY}" "${S4_KEEP}"
rm -f "${S4_BODY}"
pass "preview session created (id=${PREVIEW_SESSION_ID})"

# ---------------------------------------------------------------------------
# 5. Preview session persistence safety
# ---------------------------------------------------------------------------
section "5. Preview session persistence safety"
python3 - "${CLEAN_ID}" "${PREVIEW_SESSION_ID}" <<'PY' | tee -a "${REPORT}"
import json, subprocess, sys
project_id, session_id = sys.argv[1], sys.argv[2]
sql = f"""
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='context_disclosure_preview_sessions'
ORDER BY ordinal_position;
"""
cols = subprocess.check_output(
    ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "specpilot", "-d", "specpilot", "-t", "-A", "-c", sql],
    cwd="/Users/silveriobernal/Documents/Code/Development/spec-pilot",
    text=True,
).strip().splitlines()
forbidden = {
    "excerpt","excerpts","file_body","decoded_text","raw_bytes","snippet","snippets",
    "secret","secrets","absolute_path","repository_path","body","content","payload",
}
errors = []
for c in cols:
    if c in forbidden or "excerpt" in c or "secret" in c or "body" in c:
        errors.append(f"forbidden column {c}")
required = {
    "id","project_id","context_bundle_id","stage","configuration_version_id","source_hash",
    "manifest_schema_version","selection_policy_id","token_estimator_id","manifest_hash",
    "preview_policy_id","preview_integrity_hash","item_count","previewed_code_point_count",
    "created_at","expires_at",
}
missing = required - set(cols)
if missing:
    errors.append(f"missing columns {sorted(missing)}")
row_sql = f"SELECT row_to_json(t) FROM (SELECT * FROM context_disclosure_preview_sessions WHERE id = '{session_id}' AND project_id = '{project_id}') t;"
row_raw = subprocess.check_output(
    ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "specpilot", "-d", "specpilot", "-t", "-A", "-c", row_sql],
    cwd="/Users/silveriobernal/Documents/Code/Development/spec-pilot",
    text=True,
).strip()
row = json.loads(row_raw)
for bad in ("excerpt","excerpts","file_body","decoded_text","raw_bytes","snippet","secret","absolute_path"):
    if bad in row:
        errors.append(f"row has {bad}")
# Ensure no excerpt-like values snuck into JSON dump of row
blob = json.dumps(row)
for needle in ("line-one ordinary text", "alpha\\r\\n", "/Users/"):
    if needle in blob:
        errors.append(f"row JSON leaked {needle!r}")
if errors:
    for e in errors:
        print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: preview session metadata-only persistence")
PY
SESSIONS_AFTER_PREVIEW="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "preview created exactly one session delta" "1" "$((SESSIONS_AFTER_PREVIEW - SESSIONS_BEFORE))"

# Snapshot bundle row for immutability
BUNDLE_ROW_BEFORE="$(sql_ro "SELECT md5(row_to_json(t)::text) FROM (SELECT * FROM context_bundles WHERE id = '${BUNDLE1_ID}') t;" | tr -d '[:space:]')"

# ---------------------------------------------------------------------------
# 6. Approval success
# ---------------------------------------------------------------------------
section "6. Approval success"
APPROVALS_BEFORE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
APPR_REQ="$(mktemp)"
python3 - "${PREVIEW_SESSION_ID}" "${BUNDLE1_MANIFEST_HASH}" "${APPR_REQ}" <<'PY'
import json, sys
json.dump(
    {"previewSessionId": sys.argv[1], "manifestHash": sys.argv[2], "decision": "approved"},
    open(sys.argv[3], "w"),
)
PY
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/disclosure-approvals" "${APPR_REQ}"
rm -f "${APPR_REQ}"
S6_BODY="${BODY_FILE}"
assert_eq "approval HTTP" "201" "${HTTP_STATUS}"

S6_ASSERT_LOG="$(mktemp)"
APPROVAL_ID="$(
  python3 - "${S6_BODY}" "${CLEAN_ID}" "${BUNDLE1_ID}" "${PREVIEW_SESSION_ID}" "${BUNDLE1_MANIFEST_HASH}" "${PREVIEW_INTEGRITY_HASH}" 2>"${S6_ASSERT_LOG}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
project_id, bundle_id, sid, mh, pih = sys.argv[2:7]
errors = []
def check(cond, msg):
    if not cond: errors.append(msg)
check(body.get("status") == "ok", "status")
check(isinstance(body.get("id"), str) and body["id"], "id")
check(body.get("projectId") == project_id, "projectId")
check(body.get("contextBundleId") == bundle_id, "contextBundleId")
check(body.get("previewSessionId") == sid, "previewSessionId")
check(body.get("manifestHash") == mh, "manifestHash")
check(body.get("previewIntegrityHash") == pih, "previewIntegrityHash")
check(body.get("previewPolicyId") == "bounded-selected-text-v1", "previewPolicyId")
check(body.get("approvalPolicyId") == "explicit-disclosure-approval-v1", "approvalPolicyId")
check(body.get("decision") == "approved", "decision")
check(body.get("contentTransmitted") is False, "contentTransmitted")
check(body.get("approvalRequired") is False, "approvalRequired")
raw = open(sys.argv[1], encoding="utf-8").read()
for needle in ("excerpt", "file body", "/Users/", "matchedValue", "stack"):
    # field names like previewIntegrityHash ok; forbid excerpt payloads
    pass
for needle in ("line-one ordinary text", "matchedValue", "/Users/", "SPECPILOT_HOST"):
    check(needle not in raw, f"leaked {needle!r}")
if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    raise SystemExit(1)
print("PASS: approval success contract", file=sys.stderr)
print(body["id"], end="")
PY
)"
tee -a "${REPORT}" <"${S6_ASSERT_LOG}" >/dev/null
cat "${S6_ASSERT_LOG}" >&2 || true
rm -f "${S6_ASSERT_LOG}" "${S6_BODY}"
pass "approval created (id=${APPROVAL_ID})"
APPROVALS_AFTER="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "approval created exactly one row delta" "1" "$((APPROVALS_AFTER - APPROVALS_BEFORE))"

# ---------------------------------------------------------------------------
# 7. Status after approval
# ---------------------------------------------------------------------------
section "7. Status after approval"
http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/disclosure-status"
S7_BODY="${BODY_FILE}"
assert_eq "post-approval status HTTP" "200" "${HTTP_STATUS}"
python3 - "${S7_BODY}" "${APPROVAL_ID}" "${BUNDLE1_MANIFEST_HASH}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
appr_id, mh = sys.argv[2], sys.argv[3]
errors = []
def check(cond, msg):
    if not cond: errors.append(msg)
check(body.get("approvalRequired") is False, "approvalRequired")
check(body.get("coveringApprovalId") == appr_id, "coveringApprovalId")
check(body.get("contentTransmitted") is False, "contentTransmitted")
check(body.get("previewPolicyId") == "bounded-selected-text-v1", "previewPolicyId")
check(body.get("approvalPolicyId") == "explicit-disclosure-approval-v1", "approvalPolicyId")
check(body.get("manifestHash") == mh, "manifestHash")
if errors:
    for e in errors: print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: post-approval disclosure-status")
PY
rm -f "${S7_BODY}"

# ---------------------------------------------------------------------------
# 8. Latest approval
# ---------------------------------------------------------------------------
section "8. Latest approval"
http_json GET "${API_BASE}/projects/${CLEAN_ID}/disclosure-approvals?stage=planning&limit=1"
S8_BODY="${BODY_FILE}"
assert_eq "latest HTTP" "200" "${HTTP_STATUS}"
python3 - "${S8_BODY}" "${APPROVAL_ID}" "${PREVIEW_SESSION_ID}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
appr_id, sid = sys.argv[2], sys.argv[3]
errors = []
def check(cond, msg):
    if not cond: errors.append(msg)
check(body.get("status") == "ok", "status")
items = body.get("items")
check(isinstance(items, list) and len(items) == 1, "items length")
it = items[0]
check(it.get("id") == appr_id, "id")
check(it.get("contentTransmitted") is False, "contentTransmitted")
check(it.get("previewSessionId") == sid, "previewSessionId")
check(it.get("previewPolicyId") == "bounded-selected-text-v1", "previewPolicyId")
check(it.get("approvalPolicyId") == "explicit-disclosure-approval-v1", "approvalPolicyId")
if errors:
    for e in errors: print(f"FAIL: {e}")
    raise SystemExit(1)
print("PASS: latest approval")
PY
rm -f "${S8_BODY}"

# ---------------------------------------------------------------------------
# 9. Identical material coverage
# ---------------------------------------------------------------------------
section "9. Identical material coverage"
SESSIONS_BEFORE_DUP="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
APPROVALS_BEFORE_DUP="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
create_bundle_planning "${CLEAN_ID}"
S9_BODY="${BODY_FILE}"
assert_eq "second bundle HTTP" "201" "${HTTP_STATUS}"
BUNDLE2_ID="$(
  python3 - "${S9_BODY}" "${BUNDLE1_ID}" "${BUNDLE1_MANIFEST_HASH}" <<'PY'
import json, sys
body = json.load(open(sys.argv[1]))
first_id, mh = sys.argv[2], sys.argv[3]
assert body["id"] != first_id
assert body["manifestHash"] == mh
assert "contentTransmitted" not in body
print(body["id"], end="")
PY
)"
rm -f "${S9_BODY}"
pass "second bundle created (id=${BUNDLE2_ID})"

http_json GET "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE2_ID}/disclosure-status"
S9_STATUS="${BODY_FILE}"
assert_eq "second bundle status HTTP" "200" "${HTTP_STATUS}"
python3 - "${S9_STATUS}" "${APPROVAL_ID}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
appr_id = sys.argv[2]
assert body.get("approvalRequired") is False
assert body.get("coveringApprovalId") == appr_id
print("PASS: identical material covered without new approval")
PY
rm -f "${S9_STATUS}"
SESSIONS_AFTER_DUP="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
APPROVALS_AFTER_DUP="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "no auto preview session on identical recreate" "${SESSIONS_BEFORE_DUP}" "${SESSIONS_AFTER_DUP}"
assert_eq "no auto approval on identical recreate" "${APPROVALS_BEFORE_DUP}" "${APPROVALS_AFTER_DUP}"

# ---------------------------------------------------------------------------
# 10. Mutate after preview blocked
# ---------------------------------------------------------------------------
section "10. Mutate-after-preview blocked path"
MUT_DIR="${SPECPILOT_HOST_REPOS_ROOT}/sp-w02-s04-mutate-${STAMP}"
create_clean_fixture_repo "${MUT_DIR}" "sp-w02-s04-mutate" "W02 S04 Mutate Fixture"
register_project "${MUT_DIR}" "w02-s04-mutate-fixture"
MUT_ID="${REGISTERED_PROJECT_ID}"
track_id "${MUT_ID}"
create_bundle_planning "${MUT_ID}"
assert_eq "mutate project bundle HTTP" "201" "${HTTP_STATUS}"
MUT_BUNDLE_ID="$(python3 - "${BODY_FILE}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["id"], end="")
PY
)"
MUT_MH="$(python3 - "${BODY_FILE}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["manifestHash"], end="")
PY
)"
rm -f "${BODY_FILE}"

http_json POST "${API_BASE}/projects/${MUT_ID}/context-bundles/${MUT_BUNDLE_ID}/preview" <(printf '{}')
assert_eq "mutate-path preview HTTP" "200" "${HTTP_STATUS}"
MUT_SESSION_ID="$(python3 - "${BODY_FILE}" <<'PY'
import json,sys
print(json.load(open(sys.argv[1]))["previewSessionId"], end="")
PY
)"
rm -f "${BODY_FILE}"
MUT_SESSIONS_AFTER_OK="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${MUT_ID}';" | tr -d '[:space:]')"
MUT_APPROVALS_BEFORE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${MUT_ID}';" | tr -d '[:space:]')"

# Mutate selected file without new bundle
printf '%s\n' 'mutated content after preview' >"${MUT_DIR}/docs/multi.md"

MUT_APPR_REQ="$(mktemp)"
python3 - "${MUT_SESSION_ID}" "${MUT_MH}" "${MUT_APPR_REQ}" <<'PY'
import json, sys
json.dump(
    {"previewSessionId": sys.argv[1], "manifestHash": sys.argv[2], "decision": "approved"},
    open(sys.argv[3], "w"),
)
PY
http_json POST "${API_BASE}/projects/${MUT_ID}/context-bundles/${MUT_BUNDLE_ID}/disclosure-approvals" "${MUT_APPR_REQ}"
rm -f "${MUT_APPR_REQ}"
S10_BODY="${BODY_FILE}"
assert_eq "mutate-after-preview approval HTTP" "422" "${HTTP_STATUS}"
python3 - "${S10_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
raw = open(sys.argv[1], encoding="utf-8").read()
assert body.get("code") == "disclosure_preview_integrity_mismatch", body
for needle in ("mutated content after preview", "/Users/", "matchedValue", "stack", "excerpt"):
    # code/message may mention integrity; forbid mutated file content and absolute paths
    pass
assert "mutated content after preview" not in raw
assert "/Users/" not in raw
assert "matchedValue" not in raw
print("PASS: mutate-after-preview blocked with disclosure_preview_integrity_mismatch")
PY
rm -f "${S10_BODY}"
MUT_APPROVALS_AFTER="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${MUT_ID}';" | tr -d '[:space:]')"
assert_eq "no approval row after mutate block" "${MUT_APPROVALS_BEFORE}" "${MUT_APPROVALS_AFTER}"

http_json POST "${API_BASE}/projects/${MUT_ID}/context-bundles/${MUT_BUNDLE_ID}/preview" <(printf '{}')
S10B_BODY="${BODY_FILE}"
assert_eq "stale-bundle re-preview HTTP" "422" "${HTTP_STATUS}"
python3 - "${S10B_BODY}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
assert body.get("code") == "disclosure_preview_integrity_mismatch"
raw = open(sys.argv[1], encoding="utf-8").read()
assert "mutated content after preview" not in raw
print("PASS: re-preview against stale bundle blocked")
PY
rm -f "${S10B_BODY}"
MUT_SESSIONS_AFTER_FAIL="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${MUT_ID}';" | tr -d '[:space:]')"
assert_eq "failed re-preview created no new session" "${MUT_SESSIONS_AFTER_OK}" "${MUT_SESSIONS_AFTER_FAIL}"

# ---------------------------------------------------------------------------
# 11. Additional binding blocks
# ---------------------------------------------------------------------------
section "11. Additional binding blocks"
# Missing previewSessionId against clean project/bundle
MISS_REQ="$(mktemp)"
python3 - "${BUNDLE1_MANIFEST_HASH}" "${MISS_REQ}" <<'PY'
import json, sys
json.dump({"manifestHash": sys.argv[1], "decision": "approved"}, open(sys.argv[2], "w"))
PY
APPROVALS_BEFORE_MISS="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/disclosure-approvals" "${MISS_REQ}"
rm -f "${MISS_REQ}"
assert_eq "missing previewSessionId HTTP" "422" "${HTTP_STATUS}"
python3 - "${BODY_FILE}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
assert body.get("code") == "disclosure_preview_required"
print("PASS: missing previewSessionId => disclosure_preview_required")
PY
rm -f "${BODY_FILE}"
APPROVALS_AFTER_MISS="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "no approval after missing session" "${APPROVALS_BEFORE_MISS}" "${APPROVALS_AFTER_MISS}"

# Foreign session: use mutate project's session against clean project's bundle
# (session exists but wrong project/bundle → disclosure_preview_required by findFirst)
FOREIGN_REQ="$(mktemp)"
python3 - "${MUT_SESSION_ID}" "${BUNDLE1_MANIFEST_HASH}" "${FOREIGN_REQ}" <<'PY'
import json, sys
json.dump(
    {"previewSessionId": sys.argv[1], "manifestHash": sys.argv[2], "decision": "approved"},
    open(sys.argv[3], "w"),
)
PY
http_json POST "${API_BASE}/projects/${CLEAN_ID}/context-bundles/${BUNDLE1_ID}/disclosure-approvals" "${FOREIGN_REQ}"
rm -f "${FOREIGN_REQ}"
assert_eq "foreign session HTTP" "422" "${HTTP_STATUS}"
python3 - "${BODY_FILE}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
code = body.get("code")
assert code in ("disclosure_preview_required", "disclosure_preview_binding_mismatch"), body
print(f"PASS: foreign session blocked with {code}")
PY
rm -f "${BODY_FILE}"
APPROVALS_AFTER_FOREIGN="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "no approval after foreign session" "${APPROVALS_BEFORE_MISS}" "${APPROVALS_AFTER_FOREIGN}"

# ---------------------------------------------------------------------------
# 12. Invalid latest query
# ---------------------------------------------------------------------------
section "12. Invalid latest query"
BUNDLES_BEFORE_Q="$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
SESSIONS_BEFORE_Q="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
APPROVALS_BEFORE_Q="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
http_json GET "${API_BASE}/projects/${CLEAN_ID}/disclosure-approvals?stage=planning&limit=2"
assert_eq "invalid latest HTTP" "422" "${HTTP_STATUS}"
python3 - "${BODY_FILE}" <<'PY' | tee -a "${REPORT}"
import json, sys
body = json.load(open(sys.argv[1]))
assert body.get("code") == "invalid_disclosure_approval_query"
print("PASS: invalid latest query")
PY
rm -f "${BODY_FILE}"
assert_eq "invalid query did not create bundles" "${BUNDLES_BEFORE_Q}" "$(sql_ro "SELECT COUNT(*) FROM context_bundles WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "invalid query did not create sessions" "${SESSIONS_BEFORE_Q}" "$(sql_ro "SELECT COUNT(*) FROM context_disclosure_preview_sessions WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"
assert_eq "invalid query did not create approvals" "${APPROVALS_BEFORE_Q}" "$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}';" | tr -d '[:space:]')"

# ---------------------------------------------------------------------------
# 13. Persistence and immutability
# ---------------------------------------------------------------------------
section "13. Persistence and immutability"
BUNDLE_ROW_AFTER="$(sql_ro "SELECT md5(row_to_json(t)::text) FROM (SELECT * FROM context_bundles WHERE id = '${BUNDLE1_ID}') t;" | tr -d '[:space:]')"
assert_eq "ContextBundle row unchanged after preview/approval" "${BUNDLE_ROW_BEFORE}" "${BUNDLE_ROW_AFTER}"

TX_FALSE="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${CLEAN_ID}' AND content_transmitted = true;" | tr -d '[:space:]')"
assert_eq "no approval with content_transmitted true" "0" "${TX_FALSE}"

TX_FALSE_ALL="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE content_transmitted = false AND project_id IN ('${CLEAN_ID}','${MUT_ID}');" | tr -d '[:space:]')"
TX_TOTAL="$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id IN ('${CLEAN_ID}','${MUT_ID}');" | tr -d '[:space:]')"
assert_eq "all disposable approvals have content_transmitted false" "${TX_TOTAL}" "${TX_FALSE_ALL}"

FORBIDDEN_COLS2="$(sql_ro "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='context_bundles' AND column_name IN ('content_transmitted','approval','decision','preview_session_id');" | tr -d '[:space:]')"
assert_eq "still no forbidden ContextBundle columns" "0" "${FORBIDDEN_COLS2}"

# Mutate project should have zero approvals
assert_eq "mutate project approvals remain zero" "0" "$(sql_ro "SELECT COUNT(*) FROM context_disclosure_approvals WHERE project_id = '${MUT_ID}';" | tr -d '[:space:]')"

pass "persistence and immutability checks"

# ---------------------------------------------------------------------------
# Summary before cleanup trap
# ---------------------------------------------------------------------------
section "Summary"
log "PASS_COUNT=${PASS_COUNT}"
log "FAIL_COUNT=${FAIL_COUNT}"
log "Finished body: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "REPORT=${REPORT}"

if [[ "${FAIL_COUNT}" -ne 0 ]]; then
  log "RESULT=FAIL"
  printf '%s\n' "${REPORT}" 
  if command -v pbcopy >/dev/null 2>&1; then
    pbcopy <"${REPORT}" || true
    log "Copied sanitized report to clipboard via pbcopy"
  fi
  exit 1
fi

log "RESULT=PASS"
printf '%s\n' "${REPORT}"
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"${REPORT}" || true
  log "Copied sanitized report to clipboard via pbcopy"
fi

# cleanup via trap EXIT
