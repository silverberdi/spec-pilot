# Baseline Validation Checklist

- [ ] All machine IDs are lowercase kebab-case.
- [ ] Roadmap, waves, slices, User Stories, and expected changes cross-reference correctly.
- [ ] Every slice has exactly three declared User Stories in this package.
- [ ] No User Story, slice, or wave is marked completed.
- [ ] Cursor is the only declared implementer of the SpecPilot codebase.
- [ ] No agent-specific review gate exists.
- [ ] Optional Cline + DeepSeek validation is explicitly read-only.
- [ ] Generated integrations are untouched except through `openspec update`.
- [ ] `openspec/config.yaml` contains project-specific rules and parses successfully.
- [ ] `openspec validate --all` exits successfully.
- [ ] Repository contains no secrets.
- [ ] No unrelated project terminology is present.
- [ ] No OpenSpec change is created before the reviewed baseline commit.
