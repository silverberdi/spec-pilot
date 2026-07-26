# Shared contracts changes (task 3.4)

Liveness contract unchanged: `{ "status": "ok", "service": "api" }`.

Added readiness helpers in `@specpilot/shared-contracts`:

- `ReadyResponse` / `createReadyResponse` / `isReadyResponse`
- `UnreadyResponse` / `createUnreadyResponse`

Payload: success `{ "status": "ok", "service": "api", "database": "ok" }`; failure `{ "status": "error", "service": "api", "database": "unavailable" }`.
