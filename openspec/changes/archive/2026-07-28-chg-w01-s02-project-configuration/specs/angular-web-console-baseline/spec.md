## MODIFIED Requirements

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration and project-configuration operator surface in `apps/web` as required by `local-project-registration` and `project-yaml-configuration` (register attach outcomes and explicit configuration refresh). This change MUST NOT implement complete product internationalization, accessibility polish, light/dark/system theme switching, or a project dashboard / discovery-health listing UI (those remain later-slice scope).

#### Scenario: Spanish registration and configuration surface is allowed
- **WHEN** the web console loads the project-registration and configuration-outcomes operator surface delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for that registration and configuration flow

#### Scenario: Dashboard and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, light/dark/system theme switching, and project dashboard / discovery-health UI are not required or claimed as delivered by this change
