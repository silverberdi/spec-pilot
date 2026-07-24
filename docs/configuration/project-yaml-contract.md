# `.specpilot/project.yaml` Contract

The file is mandatory and version-controlled in every registered repository. It declares portable integration rules. PostgreSQL stores normalized immutable snapshots and operational state.

```yaml
schemaVersion: 1
project:
  id: content-factory
  name: Content Factory
repository:
  mainBranch: main
openspec:
  path: openspec
delivery:
  methodology: wave-slice # or generic/custom
  wave:
    activeStatePath: docs/context/current-state.md
  mapping:
    changeIdPattern: "chg-{wave}-{slice}-{slug}"
context:
  include:
    - AGENTS.md
    - docs/context/**
    - docs/roadmap/**
    - docs/backlog/**
    - docs/waves/**
    - openspec/**
  exclude:
    - "**/.env"
    - "**/.env.*"
    - "**/*.pem"
    - "**/*.key"
    - "**/secrets/**"
review:
  provider: deepseek
  models:
    discovery: deepseek-v4-flash
    planning: deepseek-v4-pro
    applied: deepseek-v4-pro
    verify: deepseek-v4-pro
  monthlyBudgetUsd: 10
executors:
  cursor:
    enabled: true
  codex:
    enabled: true
```

## Validation rules

- machine IDs lowercase kebab-case;
- repository path itself is stored in SpecPilot, not committed in YAML;
- include/exclude globs must remain inside repository root;
- at least one OpenSpec path must resolve;
- model identifiers must be allowlisted;
- budget must be positive and may not exceed an application-level safety cap without explicit configuration change.
