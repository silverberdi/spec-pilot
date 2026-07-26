# Operator commands — SpecPilot local runtime (w00-s03)

Use **only** SpecPilot Compose project resources. Never stop, restart, modify, or delete `axioma-db-dev` or foreign volumes/networks. Never run `docker compose down --volumes` outside this repository / project `specpilot`.

## Compose (full stack)

```bash
# Pre-check: host 5441 free; axioma-db-dev untouched on 5440
docker compose -p specpilot up -d --build
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/health/ready
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8081/
docker compose -p specpilot down
```

## SpecPilot-local volume reset (destructive, local-only)

```bash
docker compose -p specpilot down
docker volume rm specpilot-postgres-data
```

## Native macOS (Compose Postgres only)

```bash
docker compose -p specpilot up -d postgres
cp .env.example .env   # DATABASE_URL → localhost:5441
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma --config=apps/api/prisma.config.ts
# from apps/api cwd, or set paths accordingly
npx nx serve api
npx nx serve web
```

## OpenSpec (hyphenated)

`/opsx-apply` · `/opsx-verify` · `/opsx-sync` · `/opsx-archive` · `/opsx-update`

## Ports

| Service | Host |
|---|---|
| SpecPilot Postgres | `localhost:5441` |
| SpecPilot API | `localhost:3000` |
| SpecPilot Web | `localhost:8081` |
| Axioma (foreign — do not use) | `localhost:5440` |
