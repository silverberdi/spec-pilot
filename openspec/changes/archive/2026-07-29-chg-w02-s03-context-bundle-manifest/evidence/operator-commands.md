# Operator commands — context-bundle (w02-s03)

Hyphenated OpenSpec command syntax for this change:

```text
/opsx-apply chg-w02-s03-context-bundle-manifest
/opsx-verify chg-w02-s03-context-bundle-manifest
/opsx-sync chg-w02-s03-context-bundle-manifest
/opsx-archive chg-w02-s03-context-bundle-manifest
```

## Product operator flows (API)

Success (clean eligible files):

```bash
curl -sS -X POST "$API/projects/$PROJECT_ID/context-bundles" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'
# expect HTTP 201 with entries, manifestHash, algorithm ids
```

Empty success:

```bash
# project whose context patterns match no files
curl -sS -X POST "$API/projects/$PROJECT_ID/context-bundles" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'
# expect HTTP 201 entryCount=0
```

Blocked unsafe (all candidates excluded):

```bash
curl -sS -X POST "$API/projects/$PROJECT_ID/context-bundles" \
  -H 'content-type: application/json' \
  -d '{"stage":"planning"}'
# expect HTTP 422 code=unsafe_context_bundle with safe counts only
```

Get / latest:

```bash
curl -sS "$API/projects/$PROJECT_ID/context-bundles/$BUNDLE_ID"
curl -sS "$API/projects/$PROJECT_ID/context-bundles?stage=planning&limit=1"
```

## Human validation (task 10.1)

Requires `SPECPILOT_HOST_REPOS_ROOT` (or `.env`), API on `:3000`, and SpecPilot postgres via Compose. Disposable fixtures only; cleanup is trapped.

```bash
bash openspec/changes/chg-w02-s03-context-bundle-manifest/evidence/operator-human-validation.sh
```

Do not mark task 10.1 complete until the operator confirms the sanitized report and updates `evidence/human-validation.md`.
