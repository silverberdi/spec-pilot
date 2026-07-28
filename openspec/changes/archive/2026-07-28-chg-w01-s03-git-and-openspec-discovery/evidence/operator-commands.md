# Operator commands — discovery (w01-s03)

Hyphenated OpenSpec lifecycle commands (planning/closure only; not executed against target repos by SpecPilot product API):

- `/opsx-apply`
- `/opsx-verify`
- `/opsx-sync`
- `/opsx-archive`

## Product API (read-only discovery)

Refresh discovery for a registered project:

```bash
curl -sS -X POST "http://localhost:3000/projects/<project-id>/discovery/refresh"
```

Get last discovery (404 `discovery_not_found` if never inspected):

```bash
curl -sS "http://localhost:3000/projects/<project-id>/discovery"
```

Success: HTTP 200 `ProjectDiscoveryDto` (Git/OpenSpec ok or blocked subsystems).  
Hard path failure: HTTP 422 `repository_not_found` / `repository_not_directory` / `repository_not_readable`.  
Unexpected: HTTP 500 `discovery_refresh_failed`.
