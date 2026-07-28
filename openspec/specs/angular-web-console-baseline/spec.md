# angular-web-console-baseline

## Purpose

Angular 22 standalone web console baseline with PrimeNG, Spanish-first i18n-ready shell presentation, and explicit bootstrap states.

## Requirements


### Requirement: Angular 22 standalone web console exists
The repository SHALL provide `apps/web` as an Angular major 22 standalone application generated with `@nx/angular` version `23.1.0` or higher that is officially compatible with Angular 22. The application MUST bootstrap with standalone APIs and MUST NOT use an NgModule-based application bootstrap. Scaffolding that produces Angular major 21 MUST NOT be accepted.

#### Scenario: Standalone Angular web app is present
- **WHEN** the web console baseline is verified
- **THEN** `apps/web` exists as an Angular 22 standalone application without NgModule bootstrap

#### Scenario: Angular 22 is generated via compatible Nx Angular plugin
- **WHEN** the web console generator and dependencies are inspected
- **THEN** `@nx/angular` is at version `23.1.0` or higher and the generated application is Angular major 22, not Angular major 21

### Requirement: PrimeNG 22 standalone UI baseline
`apps/web` MUST use PrimeNG major 22, PrimeIcons, and the official themes package required by the resolved PrimeNG 22 release. PrimeNG MUST be configured through its official standalone provider-based setup with a compatible official theme preset.

#### Scenario: PrimeNG standalone configuration is present
- **WHEN** the web console dependencies and bootstrap configuration are inspected
- **THEN** PrimeNG 22, PrimeIcons, and the required official themes package are present and PrimeNG is configured via official standalone providers

### Requirement: Spanish-first i18n-ready baseline shell
The web console MUST present SpecPilot-branded content with Spanish as the default operator-facing locale and MUST remain i18n-ready through a minimal translation or locale boundary. This change MAY implement a minimal project-registration and project-configuration operator surface in `apps/web` as required by `local-project-registration` and `project-yaml-configuration` (register attach outcomes and explicit configuration refresh). This change MUST NOT implement complete product internationalization, accessibility polish, light/dark/system theme switching, or a project dashboard / discovery-health listing UI (those remain later-slice scope).

#### Scenario: Spanish registration and configuration surface is allowed
- **WHEN** the web console loads the project-registration and configuration-outcomes operator surface delivered by this change
- **THEN** SpecPilot-branded Spanish default operator-facing copy is shown for that registration and configuration flow

#### Scenario: Dashboard and theme product features remain deferred
- **WHEN** the web console scope for this change is inspected
- **THEN** full product i18n coverage, accessibility polish, light/dark/system theme switching, and project dashboard / discovery-health UI are not required or claimed as delivered by this change

### Requirement: Shell exposes success, loading, and error behavior
The baseline shell MUST expose clear success, loading, and error behavior for shell bootstrap. If a shell region has no content yet, the UI MUST show an explicit empty placeholder rather than a blank failure state.

#### Scenario: Successful shell render
- **WHEN** web console bootstrap completes successfully
- **THEN** the shell renders in the success state

#### Scenario: Loading state is visible during bootstrap
- **WHEN** the web console is bootstrapping
- **THEN** a loading state is presented until success or error is determined

#### Scenario: Bootstrap failure is explicit
- **WHEN** web console bootstrap or required shell configuration fails
- **THEN** an error state is presented and the shell MUST NOT silently continue as if success occurred
