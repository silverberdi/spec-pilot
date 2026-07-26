import { assertDatabaseUrl } from './database-url';

describe('assertDatabaseUrl', () => {
  it('rejects missing DATABASE_URL', () => {
    expect(() => assertDatabaseUrl(undefined)).toThrow(/missing/i);
    expect(() => assertDatabaseUrl('')).toThrow(/missing/i);
    expect(() => assertDatabaseUrl('   ')).toThrow(/missing/i);
  });

  it('rejects malformed DATABASE_URL', () => {
    expect(() => assertDatabaseUrl('not-a-url')).toThrow(/malformed/i);
    expect(() => assertDatabaseUrl('http://localhost/db')).toThrow(/postgres/i);
  });

  it('accepts valid postgresql URLs', () => {
    expect(() =>
      assertDatabaseUrl(
        'postgresql://specpilot:specpilot@localhost:5441/specpilot?schema=public',
      ),
    ).not.toThrow();
    expect(() =>
      assertDatabaseUrl('postgres://user:pass@postgres:5432/db'),
    ).not.toThrow();
  });
});
