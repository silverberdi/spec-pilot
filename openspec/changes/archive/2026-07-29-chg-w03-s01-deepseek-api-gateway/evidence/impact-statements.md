| Area | Impact |
|---|---|
| Security / privacy | API key only via `DEEPSEEK_API_KEY` env; probe uses synthetic payload only; no repository/bundle/disclosure reads; no raw provider bodies or keys in DTOs/logs; fixed production base URL (no operator override). |
| Persistence | No Prisma migration; no provider-call / review / budget / finding tables; probe outcomes ephemeral. |
| Budget | No estimate/reserve/reconcile/hard-block in this slice (`w03-s03`). Probe uses `max_tokens` 256 only. |
| Migration | None. |
| Rollback | Revert gateway module/routes/UI/contracts/Compose env wiring; no DB migration to undo; never touch foreign Docker resources. |
