# Operator commands — `chg-w01-s02-project-configuration`

Hyphenated OpenSpec commands (copyable):

```text
/opsx-apply chg-w01-s02-project-configuration
/opsx-verify chg-w01-s02-project-configuration
/opsx-sync chg-w01-s02-project-configuration
/opsx-archive chg-w01-s02-project-configuration
```

Local API checks (with API serving and authorized host mount when using Compose):

```bash
# Register with valid project.yaml → expect 201 configuration.status=attached
curl -sS -X POST http://localhost:3000/projects \
  -H 'content-type: application/json' \
  -d '{"repositoryPath":"/absolute/path/to/repo"}'

# Register eligible path with invalid YAML content → expect 201 configuration.status=blocked
# Refresh configuration → expect 200 or 422
curl -sS -X POST http://localhost:3000/projects/<id>/configuration/refresh

# Get active configuration → expect 200 or 404 configuration_not_found
curl -sS http://localhost:3000/projects/<id>/configuration
```

Web console: open the registration surface, register a path, confirm attach or blocked configuration copy, then use “Actualizar configuración”.
