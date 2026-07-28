# Operator commands (copyable)

Planning / lifecycle (hyphenated OpenSpec command syntax):

```text
/opsx-apply chg-w01-s04-project-dashboard
/opsx-verify chg-w01-s04-project-dashboard
/opsx-sync chg-w01-s04-project-dashboard
/opsx-archive chg-w01-s04-project-dashboard
```

Runtime smoke (Compose API assumed on localhost:3000):

```bash
# Empty / list dashboard source
curl -sS http://127.0.0.1:3000/projects | jq .

# Register (never_inspected health on 201)
curl -sS -X POST http://127.0.0.1:3000/projects \
  -H 'content-type: application/json' \
  -d '{"repositoryPath":"/absolute/path/to/repo"}' | jq '.discoveryHealth'

# After explicit discovery refresh, list shows derived health
curl -sS -X POST "http://127.0.0.1:3000/projects/<id>/discovery/refresh" | jq .
curl -sS http://127.0.0.1:3000/projects | jq 'map({slug, discoveryHealth})'
```

Console: open the Spanish web console and confirm **Proyectos** empty/populated/blocked-health presentation without delivery controls.
