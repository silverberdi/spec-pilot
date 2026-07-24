# Baseline Validation Checklist

- [ ] All machine IDs lowercase kebab-case.
- [ ] Roadmap, waves, slices, stories, and expected changes cross-reference correctly (`chg-<slice-id>`).
- [ ] Counts: 12 waves, 42 slices, 126 User Stories.
- [ ] No story, slice, or wave marked completed.
- [ ] OpenSpec CLI actual version recorded (expected 1.6.0 for this baseline).
- [ ] Custom expanded workflows active for Cursor, Codex, and OpenCode, including `update`.
- [ ] Generated integration files untouched except via `openspec update`.
- [ ] `openspec/config.yaml` parses and contains project-specific rules.
- [ ] `openspec validate --all` exits successfully.
- [ ] Repository has no secrets.
- [ ] `package-summary.json` semantics documented (`fileCount` excludes itself).
- [ ] Candidate baseline artifacts present but do not mark `w00-s01` complete.
- [ ] No OpenSpec change exists; no wave/slice branches exist.
- [ ] Git status captured; no commit created in the reconciliation pass.
- [ ] First change planning begins only after the governed baseline commit is published.
