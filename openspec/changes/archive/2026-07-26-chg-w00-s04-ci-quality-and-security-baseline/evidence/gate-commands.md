# Gate commands — chg-w00-s04-ci-quality-and-security-baseline

## Local (mandatory before commit/push)

```bash
npm run quality-gates
# equivalent:
bash scripts/run-quality-gates.sh
```

Exact orchestrator argv sequence (inside `scripts/run-quality-gates.sh`):

1. Install integrity: `npm ci --dry-run --ignore-scripts` (fallback: lockfile parse + `npm ls --depth=0`)
2. Typecheck: `npm run typecheck` → `tsc -p packages/shared-contracts/tsconfig.lib.json --noEmit && tsc -p apps/api/tsconfig.app.json --noEmit && tsc -p apps/web/tsconfig.app.json --noEmit`
3. Dependency boundaries: `npx nx run-many -t lint --parallel=false`
4. Automated tests: `npx nx run-many -t test --parallel=false`
5. Baseline validation: `bash scripts/validate-baseline.sh`
6. Secret scanning: `python3 scripts/scan-secrets.py`

Aliases:

```bash
npm run boundaries   # nx run-many -t lint
npm run typecheck    # nx run-many -t typecheck
npm run test         # nx run-many -t test
```

Standalone validators remain available:

```bash
bash scripts/validate-baseline.sh
python3 scripts/scan-secrets.py
```

## Remote (post-push verification only)

GitHub Actions workflow: `.github/workflows/ci-quality-gates.yml`

- Triggers: `push` to `main`, `workflow_dispatch`
- Steps: checkout → setup-node 24 + npm cache → `npm ci` → `bash scripts/run-quality-gates.sh`
- Does **not** use Docker Compose
- Does **not** pre-block entry onto `main`
