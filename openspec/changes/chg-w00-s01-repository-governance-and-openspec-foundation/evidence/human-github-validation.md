# Human GitHub validation (external settings)

Local scripts cannot prove remote GitHub branch protection / required reviewers /
integration-branch push restrictions.

## Operator checklist (required before merge eligibility)

Record evidence below after validating in GitHub settings for `silverberdi/spec-pilot`:

| Setting | Expected | Operator result | Date / notes |
|---|---|---|---|
| Slice PR targets wave branch | PR base = `wave/w00-project-foundation` | _pending_ | |
| Branch protection on `main` | Enabled as applicable | _pending_ | |
| Branch protection on `wave/*` (if used) | Direct push restricted as applicable | _pending_ | |
| Required reviewers | Codex/human review required as applicable | _pending_ | |
| Draft PR not treated as merge-ready | Merge blocked until DoD gates | _pending_ | |

**Status:** `PENDING_HUMAN_VALIDATION` — blocks merge eligibility (task 4.3 / 4.9).
