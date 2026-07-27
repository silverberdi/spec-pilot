#!/usr/bin/env bash
# SpecPilot required quality-gate orchestrator (w00-s04).
# Single source of truth for local pre-commit/pre-push prevention and
# post-push GitHub Actions remote verification.
# Exit 0 = PASS; non-zero = FAIL with human-readable reasons.
# Does NOT use Docker Compose as the gate runner.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
step_fail() {
  printf 'FAIL  %s\n' "$*" >&2
  fail=1
}
step_pass() { printf 'PASS  %s\n' "$*"; }
step_info() { printf 'INFO  %s\n' "$*"; }

run_step() {
  local name="$1"
  shift
  step_info "gate: $name"
  if "$@"; then
    step_pass "$name"
    return 0
  fi
  step_fail "$name"
  return 1
}

echo "=== SpecPilot quality gates ==="
echo "root: $ROOT"
echo "note: local full-gate PASS is mandatory before commit/push (main-only policy)."
echo "note: GitHub Actions re-runs this orchestrator as post-push remote verification only."

# 1. Install integrity
step_info "gate: install integrity"
if [[ ! -f package-lock.json ]]; then
  step_fail "install integrity: missing package-lock.json"
elif ! npm ci --dry-run --ignore-scripts >/dev/null 2>&1; then
  # Fallback when dry-run is unavailable: ensure lockfile parses and deps resolve
  if ! node -e "JSON.parse(require('fs').readFileSync('package-lock.json','utf8'))" \
    || ! npm ls --depth=0 >/dev/null 2>&1; then
    step_fail "install integrity: lockfile/node_modules inconsistent (run npm ci)"
  else
    step_pass "install integrity (lockfile + npm ls)"
  fi
else
  step_pass "install integrity (npm ci --dry-run)"
fi
[[ "$fail" -eq 0 ]] || { echo "QUALITY_GATES_FAILED"; exit 1; }

# 2. Prisma client generate (required after clean npm ci; client is not committed)
# Placeholder DATABASE_URL is enough for generate; migrate/runtime still need a real URL.
if ! run_step "prisma generate" env \
  DATABASE_URL="${DATABASE_URL:-postgresql://specpilot:specpilot@localhost:5441/specpilot?schema=public}" \
  npx prisma generate \
  --schema=apps/api/prisma/schema.prisma \
  --config=apps/api/prisma.config.ts; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

# 3. Local web environment stub (gitignored; CI/Docker copy from example when absent)
WEB_ENV="apps/web/src/environments/environment.local.ts"
WEB_ENV_EXAMPLE="apps/web/src/environments/environment.local.example.ts"
if [[ ! -f "$WEB_ENV" ]]; then
  step_info "seeding $WEB_ENV from example (empty license; no secrets)"
  cp "$WEB_ENV_EXAMPLE" "$WEB_ENV"
fi

# 4. Typecheck (explicit app/lib configs; avoids broken emitDeclarationOnly nx typecheck on web specs)
if ! run_step "typecheck" npm run typecheck; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

# 5. Dependency boundaries (Nx lint loads project graph for @nx/enforce-module-boundaries)
if ! run_step "dependency-boundary lint" npx nx run-many -t lint --parallel=false; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

# 6. Automated tests (includes Testcontainers persistence suites; not Compose-as-CI)
if ! run_step "automated tests" npx nx run-many -t test --parallel=false; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

# 7. Baseline validation (includes nested secret scan; still fail-closed)
if ! run_step "baseline validation" bash scripts/validate-baseline.sh; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

# 8. Secret scanning (authoritative explicit step; must not be weakened for fixtures)
if ! run_step "secret scanning" python3 scripts/scan-secrets.py; then
  echo "QUALITY_GATES_FAILED"
  exit 1
fi

echo "=== summary ==="
echo "QUALITY_GATES_OK"
exit 0
