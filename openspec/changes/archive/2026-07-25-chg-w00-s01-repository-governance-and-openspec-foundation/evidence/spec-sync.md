=== Spec sync evidence ===
timestamp_utc: 2026-07-25T18:42:59Z
change: chg-w00-s01-repository-governance-and-openspec-foundation
operator_approval: sync authorized; archive/commit/push not authorized

--- canonical specs created ---
openspec/specs/agent-operating-contracts/spec.md
openspec/specs/baseline-validation-and-secret-scanning/spec.md
openspec/specs/closure-evidence-and-process-gates/spec.md
openspec/specs/context-and-package-integrity/spec.md
openspec/specs/delivery-graph-and-id-validation/spec.md
openspec/specs/immutable-openspec-integrations/spec.md
openspec/specs/openspec-verified-lifecycle/spec.md
openspec/specs/repository-governance/spec.md

--- requirement counts ---
agent-operating-contracts: 4 requirements
baseline-validation-and-secret-scanning: 4 requirements
closure-evidence-and-process-gates: 5 requirements
context-and-package-integrity: 3 requirements
delivery-graph-and-id-validation: 4 requirements
immutable-openspec-integrations: 3 requirements
openspec-verified-lifecycle: 4 requirements
repository-governance: 5 requirements

--- openspec list --specs ---
Specs:
  agent-operating-contracts                   requirements 4
  baseline-validation-and-secret-scanning     requirements 4
  closure-evidence-and-process-gates          requirements 5
  context-and-package-integrity               requirements 3
  delivery-graph-and-id-validation            requirements 4
  immutable-openspec-integrations             requirements 3
  openspec-verified-lifecycle                 requirements 4
  repository-governance                       requirements 5

--- openspec validate --all ---
- Validating...
✓ spec/agent-operating-contracts
✓ spec/baseline-validation-and-secret-scanning
✓ change/chg-w00-s01-repository-governance-and-openspec-foundation
✓ spec/closure-evidence-and-process-gates
✓ spec/context-and-package-integrity
✓ spec/delivery-graph-and-id-validation
✓ spec/immutable-openspec-integrations
✓ spec/openspec-verified-lifecycle
✓ spec/repository-governance
Totals: 9 passed, 0 failed (9 items)
validate_all_exit=0

--- openspec validate change ---
Change 'chg-w00-s01-repository-governance-and-openspec-foundation' is valid
validate_change_exit=0
