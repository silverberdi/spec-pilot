#!/usr/bin/env bash
# SpecPilot baseline validation orchestrator.
# Adopted by w00-s01. Exit 0 = pass; non-zero = fail with human-readable reasons.
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

# OpenSpec CLI — prefer PATH, then local shim, then npm-installed bin (CI after npm ci).
resolve_openspec() {
  if command -v openspec >/dev/null 2>&1; then
    command -v openspec
    return 0
  fi
  if [[ -x "$ROOT/.tools/bin/openspec" ]]; then
    printf '%s\n' "$ROOT/.tools/bin/openspec"
    return 0
  fi
  if [[ -x "$ROOT/node_modules/.bin/openspec" ]]; then
    printf '%s\n' "$ROOT/node_modules/.bin/openspec"
    return 0
  fi
  return 1
}

OPENSPEC_BIN=""
if OPENSPEC_BIN="$(resolve_openspec)"; then
  ver="$( ("$OPENSPEC_BIN" --version 2>/dev/null || true) | head -n1 | tr -d '[:space:]')"
  pass "openspec --version => $ver"
else
  bad "openspec CLI not found (PATH, .tools/bin, or node_modules/.bin)"
fi

if [[ -n "$OPENSPEC_BIN" ]]; then
  if "$OPENSPEC_BIN" schema validate spec-driven >/dev/null 2>&1; then
    pass "openspec schema validate spec-driven"
  else
    bad "openspec schema validate spec-driven failed"
  fi
  if "$OPENSPEC_BIN" validate --all >/dev/null 2>&1; then
    pass "openspec validate --all"
  else
    bad "openspec validate --all failed"
  fi
  if "$OPENSPEC_BIN" doctor >/dev/null 2>&1; then
    pass "openspec doctor"
  else
    bad "openspec doctor failed"
  fi
fi

# Integration inventories (expected counts from docs/context/file-index.md)
# Drift fails with guidance to refresh via `openspec update` — never hand-edit.
count_files() {
  if [[ -d "$1" ]]; then
    find "$1" -type f | wc -l | tr -d ' '
  else
    echo 0
  fi
}
check_inventory() {
  local label="$1" dir="$2" expected="$3"
  local actual
  actual="$(count_files "$dir")"
  if [[ "$actual" == "$expected" ]]; then
    pass "$label: $actual"
  else
    bad "$label: $actual (expected $expected per docs/context/file-index.md). Refresh generated integrations with \`openspec update\`; do not hand-edit generated files."
  fi
}
check_inventory "cursor commands" ".cursor/commands" "12"
check_inventory "cursor skills" ".cursor/skills" "12"
check_inventory "codex skills" ".codex/skills" "12"
check_inventory "opencode commands" ".opencode/commands" "12"
check_inventory "opencode skills" ".opencode/skills" "12"

# Delivery graph + kebab IDs
if python3 "$ROOT/scripts/validate-delivery-graph.py"; then
  pass "delivery graph + machine IDs"
else
  bad "delivery graph + machine IDs"
fi

# Active OpenSpec changes are allowed after first-change creation; archive is ignored.
if [[ -d openspec/changes ]]; then
  active_changes="$(find openspec/changes -mindepth 1 -maxdepth 1 ! -name archive -print | wc -l | tr -d ' ')"
  info "active OpenSpec change directories: $active_changes"
else
  info "no openspec/changes directory"
fi

# Product scaffolding required from w00-s02 onward (Nx monorepo baseline)
if [[ -d apps ]] && [[ -d packages ]] && [[ -f package.json ]]; then
  pass "product scaffolding present (apps/packages/package.json)"
else
  bad "product scaffolding missing (require apps/, packages/, and root package.json from w00-s02)"
fi

# package-summary semantics
if python3 - <<'PY'
import json
from pathlib import Path
s = json.loads(Path("package-summary.json").read_text())
assert "semantics" in s, "missing semantics field"
excludes_self = s.get("fileCountExcludesSelf")
if excludes_self is None and isinstance(s.get("semantics"), dict):
    excludes_self = s["semantics"].get("fileCountExcludesSelf")
assert excludes_self is True, "fileCountExcludesSelf must be true"
assert s["fileCount"] == len(s["files"]), (
    f"fileCount {s['fileCount']} != len(files) {len(s['files'])}"
)
paths = {f["path"] for f in s["files"]}
assert "package-summary.json" not in paths, (
    "package-summary.json must exclude itself from files"
)
assert s.get("waveCount") == 12, f"waveCount {s.get('waveCount')} != 12"
assert s.get("sliceCount") == 42, f"sliceCount {s.get('sliceCount')} != 42"
assert s.get("userStoryCount") == 126, f"userStoryCount {s.get('userStoryCount')} != 126"
print(
    f"fileCount={s['fileCount']} waves={s['waveCount']} "
    f"slices={s['sliceCount']} stories={s['userStoryCount']}"
)
PY
then
  pass "package-summary semantics"
else
  bad "package-summary semantics"
fi

# Secret scan (heuristic)
if python3 "$ROOT/scripts/scan-secrets.py"; then
  pass "secret scan"
else
  bad "secret scan"
fi

# Git hygiene: main-only working policy
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [[ "$branch" == "main" ]]; then
    pass "git branch: main"
  else
    bad "git branch: ${branch:-unknown} (expected main per working policy)"
  fi
else
  bad "not a git repository"
fi

echo "=== summary ==="
if [[ "$fail" -eq 0 ]]; then
  echo "BASELINE_OK"
  exit 0
fi
echo "CHANGES_REQUIRED"
exit 1
