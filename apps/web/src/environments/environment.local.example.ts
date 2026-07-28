/**
 * Local-only PrimeNG / PrimeUI configuration.
 * Copy to environment.local.ts and set primeUiLicense to your Community key.
 * Do not commit environment.local.ts.
 *
 * Compose/Docker web builds do NOT copy this file (see .dockerignore).
 * For Compose, also set PRIMEUI_LICENSE in the gitignored repo-root `.env`
 * to the same Community key, then rebuild the web service.
 */
export const environment = {
  primeUiLicense: '',
  /** Nest/Fastify API base URL for local development (no trailing slash). */
  apiBaseUrl: 'http://localhost:3000',
};
