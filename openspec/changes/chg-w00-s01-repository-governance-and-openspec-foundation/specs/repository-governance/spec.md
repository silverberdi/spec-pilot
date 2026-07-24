## ADDED Requirements

### Requirement: Delivery hierarchy binding
The repository SHALL enforce the delivery hierarchy `Roadmap → Wave → Slice → User Stories → OpenSpec tasks`, and every OpenSpec change MUST bind to exactly one wave, one slice, and its declared User Stories.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1)

#### Scenario: First change binding is complete
- **WHEN** change `chg-w00-s01-repository-governance-and-openspec-foundation` is proposed
- **THEN** it MUST declare wave `w00`, slice `w00-s01-repository-governance-and-openspec-foundation`, implementer `cursor`, reviewer `codex`, and exactly the three bound User Stories `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, and `us-w00-s01-repository-governance-and-openspec-foundation-003`

#### Scenario: Later-slice scope is rejected
- **WHEN** a proposed edit introduces `w00-s02+` or future-wave implementation scope into this change
- **THEN** the change MUST be treated as out of scope and MUST NOT be marked ready to merge

### Requirement: Lowercase kebab-case machine identifiers
All machine IDs, paths used as IDs, branch names used as IDs, and OpenSpec change names MUST use lowercase kebab-case, and the expected change name MUST equal `chg-<slice-id>`.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Valid change name
- **WHEN** the slice id is `w00-s01-repository-governance-and-openspec-foundation`
- **THEN** the expected change id MUST be `chg-w00-s01-repository-governance-and-openspec-foundation`

#### Scenario: Invalid identifier blocked
- **WHEN** a machine ID contains uppercase letters, underscores used as separators, or spaces
- **THEN** delivery-graph validation MUST fail

### Requirement: Branch and pull request governance
Delivery branches MUST follow `slice/* → wave/* → main`, slice PRs MUST target the active wave branch, wave PRs MUST target `main`, and direct pushes to protected integration branches MUST be invalid process.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1)

#### Scenario: Slice PR targets wave branch
- **WHEN** work for this slice is opened as a pull request
- **THEN** the PR MUST target the `wave/*` branch for `w00` and MUST NOT target `main` directly as a slice PR

#### Scenario: Draft PR is not merge-eligible by visibility alone
- **WHEN** a draft PR exists for visibility
- **THEN** the slice MUST remain non-merge-eligible until all Definition of Done and cross-review gates pass

### Requirement: Explicit exclusions documented
The change MUST document and preserve explicit exclusions for Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek integration, authentication, application runtime code, GitHub Actions implementation, and all `w00-s02+` / future-wave scope.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1)

#### Scenario: Exclusions present in planning artifacts
- **WHEN** proposal and design are reviewed
- **THEN** the exclusion list MUST be present and consistent across those artifacts
