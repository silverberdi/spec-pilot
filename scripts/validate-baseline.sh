#!/usr/bin/env bash
# Candidate baseline validation for SpecPilot.
# Formal adoption is owned by w00-s01; running this script does not complete that slice.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
pass() { printf 'PASS  %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; }
info() { printf 'INFO  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; fail=1; }

echo "=== SpecPilot baseline validation ==="
echo "root: $ROOT"

# OpenSpec CLI
if command -v openspec >/dev/null 2>&1; then
  ver="$( (openspec --version 2>/dev/null || true) | head -n1 | tr -d '[:space:]')"
  pass "openspec --version => $ver"
  [[ "$ver" == "1.6.0" ]] || warn "expected OpenSpec 1.6.0 for this baseline; found $ver"
else
  bad "openspec CLI not found on PATH"
fi

if command -v openspec >/dev/null 2>&1; then
  if openspec schema validate spec-driven >/dev/null 2>&1; then
    pass "openspec schema validate spec-driven"
  else
    bad "openspec schema validate spec-driven failed"
  fi
  if openspec validate --all >/dev/null 2>&1; then
    pass "openspec validate --all"
  else
    bad "openspec validate --all failed"
  fi
  if openspec doctor >/dev/null 2>&1; then
    pass "openspec doctor"
  else
    bad "openspec doctor failed"
  fi
fi

# Integration inventories
count_files() {
  if [[ -d "$1" ]]; then
    find "$1" -type f | wc -l | tr -d ' '
  else
    echo 0
  fi
}
cc="$(count_files .cursor/commands)"; cs="$(count_files .cursor/skills)"
oc="$(count_files .codex/skills)"
opc="$(count_files .opencode/commands)"; ops="$(count_files .opencode/skills)"
[[ "$cc" == "12" ]] && pass "cursor commands: $cc" || bad "cursor commands: $cc (expected 12)"
[[ "$cs" == "12" ]] && pass "cursor skills: $cs" || bad "cursor skills: $cs (expected 12)"
[[ "$oc" == "12" ]] && pass "codex skills: $oc" || bad "codex skills: $oc (expected 12)"
[[ "$opc" == "12" ]] && pass "opencode commands: $opc" || bad "opencode commands: $opc (expected 12)"
[[ "$ops" == "12" ]] && pass "opencode skills: $ops" || bad "opencode skills: $ops (expected 12)"

# Delivery graph + kebab IDs
python3 "$ROOT/scripts/validate-delivery-graph.py" && pass "delivery graph + machine IDs" || bad "delivery graph + machine IDs"

# No OpenSpec changes / no product apps yet
# A missing openspec/changes directory and a directory containing only the
# `archive` CLI scaffold are both valid zero-active-change states.
if [[ -d openspec/changes ]]; then
  active_changes="$(find openspec/changes -mindepth 1 -maxdepth 1 ! -name archive | wc -l | tr -d ' ')"
else
  active_changes=0
fi
if [[ "${active_changes}" != "0" ]]; then
  bad "active OpenSpec change directories present under openspec/changes (baseline must have none)"
else
  pass "no OpenSpec change present"
fi

if [[ -d apps ]] || [[ -d packages ]] || [[ -f package.json ]]; then
  warn "product scaffolding files present; ensure they were not introduced before w00-s02"
else
  pass "no product scaffolding (apps/packages/package.json) present"
fi

# package-summary semantics
python3 - <<'PY' && pass "package-summary semantics" || bad "package-summary semantics"
import json
from pathlib import Path
s = json.loads(Path("package-summary.json").read_text())
assert "semantics" in s, "missing semantics field"
sem = s["semantics"]
# fileCountExcludesSelf lives inside the semantics object in the current
# baseline; accept a top-level flag as well for older summaries.
excludes_self = (
    sem.get("fileCountExcludesSelf") if isinstance(sem, dict)
    else s.get("fileCountExcludesSelf")
)
assert excludes_self is True, "fileCountExcludesSelf must be true"
assert s["fileCount"] == len(s["files"]), (
    f"fileCount {s['fileCount']} != len(files) {len(s['files'])}"
)
assert "package-summary.json" not in {f["path"] for f in s["files"]}, (
    "package-summary.json must exclude itself from files"
)
print(f"fileCount={s['fileCount']} waves={s['waveCount']} slices={s['sliceCount']} stories={s['userStoryCount']}")
PY

# Secret scan (heuristic)
if python3 "$ROOT/scripts/scan-secrets.py"; then
  pass "secret scan"
else
  bad "secret scan"
fi

# Git hygiene (baseline-replacement state)
# A dirty working tree is expected here: this script validates the uncommitted
# corrected-baseline diff before it is committed.
EXPECTED_HEAD="9a0f519cbd654e5b8614a7c1fbcc8a3a088db30b"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [[ "$branch" == "main" ]]; then
    pass "git branch: main"
  else
    bad "git branch: ${branch:-unknown} (expected main)"
  fi
  head_sha="$(git rev-parse HEAD 2>/dev/null || true)"
  if [[ "$head_sha" == "$EXPECTED_HEAD" ]]; then
    pass "HEAD is expected baseline commit $EXPECTED_HEAD"
  else
    bad "HEAD is ${head_sha:-unknown} (expected $EXPECTED_HEAD)"
  fi
  # Preserved wave/slice branches are intentional rollback references while the
  # corrected baseline is reviewed. Informational only; never a validation gate.
  preserved_branches="$(git branch --list 'wave/*' 'slice/*' 2>/dev/null | sed 's/^[* ]*//' || true)"
  if [[ -n "$preserved_branches" ]]; then
    info "preserved rollback branches (intentional; not a gate):"
    while IFS= read -r b; do
      info "  $b"
    done <<<"$preserved_branches"
  else
    info "no wave/slice rollback branches present"
  fi
else
  bad "not a git repository"
fi

echo "=== summary ==="
if [[ "$fail" -eq 0 ]]; then
  echo "READY_FOR_FIRST_COMMIT"
  exit 0
fi
echo "CHANGES_REQUIRED"
exit 1
