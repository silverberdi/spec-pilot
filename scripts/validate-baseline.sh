#!/usr/bin/env bash
# SpecPilot deterministic validation entrypoint (phase-aware).
# Adopted by chg-w00-s01-repository-governance-and-openspec-foundation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
pass() { printf 'PASS  %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; fail=1; }

FIRST_CHANGE="chg-w00-s01-repository-governance-and-openspec-foundation"

echo "=== SpecPilot baseline validation (phase-aware) ==="
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
  openspec schema validate spec-driven >/dev/null && pass "openspec schema validate spec-driven" || bad "openspec schema validate spec-driven"
  openspec validate --all >/dev/null && pass "openspec validate --all" || bad "openspec validate --all"
  openspec doctor >/dev/null && pass "openspec doctor" || bad "openspec doctor"
fi

# Integration inventories (immutable surfaces; refresh only via openspec update)
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
if python3 "$ROOT/scripts/validate-delivery-graph.py"; then
  pass "delivery graph + machine IDs"
else
  bad "delivery graph + machine IDs"
fi

# Phase-aware OpenSpec change expectation:
# - pre-first-change: zero active changes
# - first-change delivery: exactly the expected first change (+ archive scaffold)
# openspec/changes/archive is the empty CLI scaffold, not an active change.
active_changes=()
while IFS= read -r line; do
  active_changes+=("$line")
done < <(find openspec/changes -mindepth 1 -maxdepth 1 ! -name archive -exec basename {} \; 2>/dev/null | sort)

if [[ ${#active_changes[@]} -eq 0 ]]; then
  pass "no OpenSpec change present (pre-first-change phase)"
elif [[ ${#active_changes[@]} -eq 1 && "${active_changes[0]}" == "$FIRST_CHANGE" ]]; then
  pass "active OpenSpec change allowed: $FIRST_CHANGE"
else
  bad "unexpected active OpenSpec changes: ${active_changes[*]:-none} (allowed: none or only $FIRST_CHANGE)"
fi

# Excluded product scaffolding for w00-s01
if [[ -d apps ]] || [[ -d packages ]] || [[ -f package.json ]]; then
  bad "excluded product scaffolding present (apps/, packages/, and/or package.json)"
else
  pass "no product scaffolding (apps/packages/package.json) present"
fi

# package-summary semantics
if python3 - <<'PY'
import json
from pathlib import Path
s = json.loads(Path("package-summary.json").read_text())
assert "semantics" in s, "missing semantics field"
assert s.get("fileCountExcludesSelf") is True
assert s["fileCount"] == len(s["files"])
assert "package-summary.json" not in {f["path"] for f in s["files"]}
print(f"fileCount={s['fileCount']} waves={s['waveCount']} slices={s['sliceCount']} stories={s['userStoryCount']}")
PY
then
  pass "package-summary semantics"
else
  bad "package-summary semantics"
fi

# Secret scan (heuristic, fail-closed)
if python3 "$ROOT/scripts/scan-secrets.py"; then
  pass "secret scan"
else
  bad "secret scan"
fi

# Git hygiene (phase-aware: do not require main-only / no-commits / no wave-slice branches)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  pass "git repository on branch: ${branch:-detached}"
else
  bad "not a git repository"
fi

echo "=== summary ==="
if [[ "$fail" -eq 0 ]]; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
