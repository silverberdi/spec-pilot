# Operator commands — context-source resolution

Read-only path resolution. SpecPilot does not modify the target repository or execute delivery workflows.

## Human validation (required for task 8.1)

Run the copyable operator validation script (success + empty success + optional blocked + safe disposable cleanup). It writes a full report under `/tmp` and copies it with `pbcopy`.

```bash
cd /Users/silveriobernal/Documents/Code/Development/spec-pilot
./openspec/changes/chg-w02-s01-context-source-resolution/evidence/operator-human-validation.sh
```

Optional override:

```bash
API_BASE=http://localhost:3000 \
SPECPILOT_HOST_REPOS_ROOT=/Users/silveriobernal/Documents/Code/Development \
./openspec/changes/chg-w02-s01-context-source-resolution/evidence/operator-human-validation.sh
```

Record confirmation in `evidence/human-validation.md` after a PASS report. Do not mark task 8.1 complete until that operator confirmation exists.

## Resolve (API smoke)

```bash
curl -sS -X POST "http://localhost:3000/projects/<project-id>/context-sources/resolve" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'
```

Stages: `new` | `planning` | `applied` | `verify`

## Console

1. Select a registered project with attached configuration.
2. Choose the review stage.
3. Click **Resolver fuentes de contexto**.
4. Confirm success (including empty `pathCount === 0`), or a blocked/error message.

## OpenSpec lifecycle (hyphenated)

```text
/opsx-apply
/opsx-verify
/opsx-sync
/opsx-archive
```
