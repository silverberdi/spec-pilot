# `.specpilot/project.yaml` Contract

The file is mandatory and version-controlled in every registered repository. It declares portable integration rules. PostgreSQL stores normalized immutable snapshots and operational state.

```yaml
schemaVersion: 1
project:
  id: spec-pilot
  name: SpecPilot
repository:
  mainBranch: main
openspec:
  path: openspec
delivery:
  methodology: wave-slice # or generic/custom
  wave:
    activeStatePath: docs/context/current-state.md
  mapping:
    changeIdPattern: "chg-{slice-id}"
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
    discovery: deepseek-flash
    planning: deepseek-pro
    applied: deepseek-pro
    verify: deepseek-pro
  monthlyBudgetUsd: 10
executor:
  tool: cursor
validationAssistants:
  clineDeepSeek:
    enabled: false
    mode: read-only
```

## Validation rules

- machine IDs are lowercase kebab-case;
- repository paths are stored in SpecPilot, not committed in YAML;
- include/exclude patterns are normalized and validated;
- secret-bearing paths are always excluded, even if included elsewhere;
- executor is Cursor for the current SpecPilot repository;
- optional validation assistants cannot gain write authority from this file;
- future product adapters are separate capabilities and do not alter the current development operating model.
