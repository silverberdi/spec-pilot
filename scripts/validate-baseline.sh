#!/usr/bin/env bash
# Candidate baseline validation for SpecPilot.
# Formal adoption is owned by w00-s01; running this script does not complete that slice.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
pass() { printf 'PASS  %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; fail=1; }

echo "=== SpecPilot baseline validation ==="
echo "root: $ROOT"

# OpenSpec CLI
if command -v openspec >/dev/null 2>&1; then
  ver="$(openspec --version 2>/dev/null | head -n1 | tr -d '[:space:]')"
  pass "openspec --version => $ver"
  [[ "$ver" == "1.6.0" ]] || warn "expected OpenSpec 1.6.0 for this baseline; found $ver"
else
  bad "openspec CLI not found on PATH"
fi

if command -v openspec >/dev/null 2>&1; then
  openspec schema validate spec-driven >/dev/null && pass "openspec schema validate spec-driven"
  openspec validate --all >/dev/null && pass "openspec validate --all"
  openspec doctor >/dev/null && pass "openspec doctor"
fi

# Integration inventories
count_files() { find "$1" -type f 2>/dev/null | wc -l | tr -d ' '; }
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
# openspec/changes/archive is the empty CLI scaffold, not an active change.
active_changes="$(find openspec/changes -mindepth 1 -maxdepth 1 ! -name archive 2>/dev/null | wc -l | tr -d ' ')"
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
assert s.get("fileCountExcludesSelf") is True
assert s["fileCount"] == len(s["files"])
assert "package-summary.json" not in {f["path"] for f in s["files"]}
print(f"fileCount={s['fileCount']} waves={s['waveCount']} slices={s['sliceCount']} stories={s['userStoryCount']}")
PY

# Secret scan (heuristic)
if python3 "$ROOT/scripts/scan-secrets.py"; then
  pass "secret scan"
else
  bad "secret scan"
fi

# Git hygiene
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  [[ "$branch" == "main" ]] && pass "git branch: main" || bad "git branch: ${branch:-unknown} (expected main)"
  if git rev-parse HEAD >/dev/null 2>&1; then
    warn "commits already exist; baseline reconciliation expected an uncommitted first commit state"
  else
    pass "no commits yet (ready for reviewed first baseline commit)"
  fi
  wave_branches="$(git branch --list 'wave/*' 'slice/*' 2>/dev/null | wc -l | tr -d ' ')"
  [[ "$wave_branches" == "0" ]] && pass "no wave/slice branches" || bad "wave/slice branches exist"
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
