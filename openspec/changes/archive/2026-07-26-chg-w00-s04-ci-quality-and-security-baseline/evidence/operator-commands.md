# Operator commands — chg-w00-s04-ci-quality-and-security-baseline

## Semantics (binding)

| Control | Role |
|---|---|
| `scripts/run-quality-gates.sh` / `npm run quality-gates` | **Mandatory local** pre-commit/pre-push prevention. Cursor and the operator MUST NOT create the final commit or push when the full local gate is not `PASS`. |
| `.github/workflows/ci-quality-gates.yml` | **Independent post-push** remote verification on `main` (`push` + `workflow_dispatch`). Fails closed and requires immediate correction. Does **not** prevent commits from entering `main`. |
| Automatically managed local Git hooks | **Not** introduced in this slice. Enforcement is procedural + evidence. |

## Copyable local commands

```bash
# Full required gate set (must PASS before commit/push)
npm run quality-gates

# Individual helpers
npm run typecheck
npm run boundaries
npm test
bash scripts/validate-baseline.sh
python3 scripts/scan-secrets.py
```

## OpenSpec lifecycle (hyphenated)

Use generated command syntax when advancing the change:

- `/opsx-apply`
- `/opsx-update`
- `/opsx-verify`
- `/opsx-sync`
- `/opsx-archive`

## Closure reminder

Full local quality-gate `PASS` evidence is required before the operator-authorized closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push.
