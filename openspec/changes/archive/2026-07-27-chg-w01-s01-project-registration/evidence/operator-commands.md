# Operator commands (registration)

Copyable local checks. Hyphenated OpenSpec commands for lifecycle:

- `/opsx-apply` — continue implementation
- `/opsx-verify` — Verify exactly `PASS` (operator-authorized)
- `/opsx-sync` — sync delta specs after Verify `PASS`
- `/opsx-archive` — archive after sync validation

## Compose API — authorized host repository root (required for macOS path registration)

The Compose `api` container cannot see host paths unless an **authorized root** is bind-mounted read-only at the **same absolute path**.

1. Copy templates (placeholders only in git):

```bash
cp .env.example .env
cp compose.override.example.yaml compose.override.yaml
```

2. In local `.env` (gitignored), set a bounded absolute root — not `/`, not `$HOME`:

```bash
SPECPILOT_HOST_REPOS_ROOT=/ABSOLUTE/PATH/TO/AUTHORIZED/REPOS/ROOT
```

3. Recreate **only** SpecPilot API (never touch `axioma-db-dev`):

```bash
docker compose up -d --build api
```

4. Confirm mount is read-only:

```bash
docker inspect specpilot-api --format '{{json .Mounts}}'
docker exec specpilot-api touch "$SPECPILOT_HOST_REPOS_ROOT/write-probe-should-fail"
# Expect: Read-only file system
```

`compose.override.yaml` and `.env` are gitignored. Tracked templates: `compose.override.example.yaml`, `.env.example`.

## API success (eligible repo under the authorized root)

```bash
curl -sS -i -X POST http://localhost:3000/projects \
  -H 'content-type: application/json' \
  -d '{"repositoryPath":"/ABSOLUTE/PATH/TO/REPO_WITH_SPECPILLOT_YAML"}'
# Expect: HTTP 201; body.repositoryPath is the host-compatible canonical realpath
```

## API duplicate conflict

```bash
curl -sS -i -X POST http://localhost:3000/projects \
  -H 'content-type: application/json' \
  -d '{"repositoryPath":"/ABSOLUTE/PATH/TO/SAME_REPO"}'
# Expect: HTTP 409 code duplicate_repository_path
```

## API blocked (missing project.yaml)

```bash
curl -sS -i -X POST http://localhost:3000/projects \
  -H 'content-type: application/json' \
  -d '{"repositoryPath":"/ABSOLUTE/PATH/TO/AUTHORIZED/REPOS/ROOT"}'
# Expect: HTTP 422 code project_yaml_missing (if that directory has no .specpilot/project.yaml)
```

## Native macOS API (no Compose mount needed)

```bash
# DATABASE_URL → localhost:5441; run api on host
npm run serve:api
```

## Web console

```bash
# With Compose API on :3000 and web on :8081 (or native serve:web)
# Paste the same macOS absolute repository path and Registrar.
```
