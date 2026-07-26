/**
 * Validates DATABASE_URL presence and basic PostgreSQL URL shape.
 * Missing/malformed configuration MUST fail startup (non-zero, no HTTP serve).
 */
export function assertDatabaseUrl(
  value: string | undefined,
): asserts value is string {
  if (value === undefined || value.trim() === '') {
    throw new Error(
      'DATABASE_URL is missing. Set a PostgreSQL connection URL before starting the API.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      'DATABASE_URL is malformed. Expected a valid PostgreSQL connection URL.',
    );
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      'DATABASE_URL must use the postgres: or postgresql: protocol.',
    );
  }
}
