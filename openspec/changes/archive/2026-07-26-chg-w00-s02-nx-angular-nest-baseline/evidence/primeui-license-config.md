# PrimeUI license configuration — chg-w00-s02-nx-angular-nest-baseline

Recorded during `/opsx-apply` resume. **No license key is recorded here.**

## Supported API (from installed PrimeNG 22 typings)

Source: `node_modules/primeng/types/primeng-config.d.ts`

- `PrimeNGConfigType` includes `license?: string`
- `providePrimeNG(...features: PrimeNGConfigType[])` accepts that config object
- Runtime (`primeng-config.mjs`): reads `feature.license`, then
  `registerLicense({ primeui: license })` via `@primeui/license-manager`

## Configuration approach

1. Gitignored local file: `apps/web/src/environments/environment.local.ts`
   - exports `environment.primeUiLicense`
   - listed in `.gitignore`
2. Committed template only: `apps/web/src/environments/environment.local.example.ts`
   - empty placeholder for `primeUiLicense`
3. `apps/web/src/app/app.config.ts` passes
   `license: environment.primeUiLicense` into existing `providePrimeNG({ theme: { preset: Aura }, ... })`
4. Theme / standalone provider setup preserved

## Validation (automated)

- `npx nx build web --configuration=development` → PASS (`evidence/success/web-build-after-primeui-license-wiring.txt`)
- `npx nx test web` → PASS (`evidence/success/web-tests-after-primeui-license-wiring.txt`)
- `git check-ignore` confirms `environment.local.ts` is ignored; example is not
- Live banner clearance is blocked until the Community key is present only in the gitignored local file (operator-supplied offline; never pasted into chat or evidence)

## Task gate

- Task 8.2 remains pending until the operator visually confirms the corrected Spanish shell without the invalid-license notice.
