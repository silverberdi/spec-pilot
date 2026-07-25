## ADDED Requirements

### Requirement: Canonical delivery hierarchy
SpecPilot delivery MUST follow `Roadmap → Wave → Slice → User Stories → OpenSpec tasks`. Every OpenSpec change MUST bind to exactly one wave, one slice, and that slice's declared User Stories unless an approved exception is documented.

#### Scenario: Change binds to one slice
- **WHEN** an OpenSpec change is created for SpecPilot delivery
- **THEN** it identifies exactly one wave, one slice, and the included User Stories for that slice

### Requirement: Lowercase kebab-case machine identifiers
Machine identifiers, paths used as IDs, and OpenSpec change names MUST use lowercase kebab-case. Expected change naming MUST follow `chg-<slice-id>`.

#### Scenario: Valid change name
- **WHEN** a change name matches `chg-<slice-id>` in lowercase kebab-case
- **THEN** identifier validation accepts the name

#### Scenario: Invalid machine ID is rejected
- **WHEN** a machine ID uses uppercase, underscores, spaces, or other non-kebab-case form where kebab-case is required
- **THEN** delivery-graph or identifier validation fails with a clear reason and non-zero exit status

### Requirement: Delivery graph cross-references are consistent
Deterministic validation MUST verify that roadmap, waves, slices, User Stories, and expected change identifiers cross-reference correctly, and that every slice has its declared User Stories.

#### Scenario: Consistent delivery graph passes
- **WHEN** the delivery graph is consistent and identifiers are valid
- **THEN** delivery-graph validation exits with status `0`

#### Scenario: Broken cross-reference fails
- **WHEN** a User Story, slice, or expected change reference is missing or inconsistent
- **THEN** delivery-graph validation fails with a human-readable reason and non-zero exit status

### Requirement: Later-slice scope is rejected
An active change MUST NOT introduce later-slice or future-wave scope.

#### Scenario: Out-of-scope content is excluded
- **WHEN** planning or implementation for this change is reviewed against its bound slice
- **THEN** product scaffolding and later-wave capabilities outside that slice are absent from the change's declared scope
