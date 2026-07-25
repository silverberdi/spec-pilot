# Product Principles

1. **OpenSpec is authoritative.** SpecPilot never invents an alternate lifecycle.
2. **Evidence before approval.** Missing evidence produces `BLOCKED`, never an inferred pass.
3. **Read-only first.** Initial versions do not mutate registered repositories.
4. **Minimal disclosure.** Send only stage-required content and never send secrets.
5. **One consolidated next instruction.** A failed review produces one complete corrective prompt.
6. **No supplementary implementation prompt after approval.** `APPLY_READY` means the executor only needs `/opsx-apply <change>`.
7. **Exact closure semantics.** Verify must be exactly `PASS`; notes do not authorize Sync.
8. **Configuration over assumptions.** Wave/slice conventions and document locations are project-specific configuration.
9. **Cost is a gate.** Budget exhaustion blocks analysis.
10. **Portable contract, centralized operations.** `.specpilot/project.yaml` declares repository integration; PostgreSQL stores operational history.
