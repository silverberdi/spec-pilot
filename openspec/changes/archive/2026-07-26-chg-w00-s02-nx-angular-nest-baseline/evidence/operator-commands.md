# Operator commands — chg-w00-s02-nx-angular-nest-baseline

Use Node.js **24.18.0** (nvm: `nvm use 24.18.0`).

## Serve

```bash
npx nx serve api
npx nx serve web
# or
npm run serve:api
npm run serve:web
```

- API health: `GET http://localhost:3000/health` → `{ "status": "ok", "service": "api" }`
- Web: SpecPilot Spanish baseline shell

## Test

```bash
npx nx test shared-contracts
npx nx test api
npx nx test web
npm test
```

## OpenSpec operator commands (hyphenated)

Copyable forms remain: `/opsx-apply`, `/opsx-update`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`.
