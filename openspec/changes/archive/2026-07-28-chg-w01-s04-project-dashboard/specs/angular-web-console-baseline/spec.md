## MODIFIED Requirements

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration, project-configuration, Git/OpenSpec discovery, and multi-project project-dashboard operator surface in `apps/web` as required by `local-project-registration`, `project-yaml-configuration`, `git-and-openspec-discovery`, and `project-dashboard` (register attach outcomes, explicit configuration refresh, explicit discovery refresh/get outcomes, and discovery-health listing). This change MUST NOT implement complete product internationalization, accessibility polish, or light/dark/system theme switching (those remain later-slice scope).

#### Scenario: Spanish registration configuration discovery and dashboard surface is allowed
- **WHEN** the web console loads the project-registration, configuration-outcomes, discovery-outcomes, and project-dashboard operator surfaces delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for those flows

#### Scenario: Full i18n and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, and light/dark/system theme switching are not required or claimed as delivered by this change
