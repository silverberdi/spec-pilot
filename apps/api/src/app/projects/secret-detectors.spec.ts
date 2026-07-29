import {
  detectSecretsInText,
  shannonEntropy,
  sortFindings,
} from './secret-detectors';

/** Build fixture strings at runtime so tracked sources do not embed scan patterns. */
function awsKey(): string {
  return `AKIA${'IOSFODNN7EXAMPL'}E`;
}
function githubPat(): string {
  return `ghp_${'abcdefghijklmnopqrstuvwxyz0123456789'}`;
}
function slackTok(): string {
  return `xoxb-${'1234567890'}-${'abcdefghij'}`;
}
function privateKeyHeader(): string {
  return `-----BEGIN ${'RSA PRIVATE KEY'}-----`;
}
function apiKeyAssign(): string {
  return `api_key = "${'abcdefghijklmnop'}${'qrstuv'}"`;
}

describe('secret-detectors', () => {
  it('detects each closed pattern without returning match text', () => {
    const cases: Array<{ id: string; text: string }> = [
      { id: 'aws_access_key', text: `key=${awsKey()}` },
      { id: 'generic_api_key_assignment', text: apiKeyAssign() },
      { id: 'private_key_block', text: `${privateKeyHeader()}\nabc` },
      { id: 'github_pat', text: `token ${githubPat()}` },
      { id: 'slack_token', text: slackTok() },
    ];
    for (const c of cases) {
      const findings = detectSecretsInText('src/a.ts', c.text);
      expect(findings.some((f) => f.detectorId === c.id)).toBe(true);
      for (const f of findings) {
        expect(Object.keys(f).sort()).toEqual(['detectorId', 'path']);
      }
    }
  });

  it('dedupes repeated matches to one finding per detector', () => {
    const pat = githubPat();
    const text = `${pat} and ${pat}`;
    const findings = detectSecretsInText('a.ts', text).filter(
      (f) => f.detectorId === 'github_pat',
    );
    expect(findings).toHaveLength(1);
  });

  it('flags high-entropy tokens and caps internal positives', () => {
    const high = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/==';
    expect(shannonEntropy(high)).toBeGreaterThanOrEqual(4.5);
    const findings = detectSecretsInText('e.ts', high);
    expect(
      findings.filter((f) => f.detectorId === 'high_entropy_token'),
    ).toHaveLength(1);

    const low = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(shannonEntropy(low)).toBeLessThan(4.5);
    expect(
      detectSecretsInText('low.ts', low).some(
        (f) => f.detectorId === 'high_entropy_token',
      ),
    ).toBe(false);
  });

  it('sorts findings by path then detector order', () => {
    const sorted = sortFindings([
      { path: 'b.ts', detectorId: 'slack_token' },
      { path: 'a.ts', detectorId: 'high_entropy_token' },
      { path: 'a.ts', detectorId: 'aws_access_key' },
    ]);
    expect(sorted.map((f) => `${f.path}:${f.detectorId}`)).toEqual([
      'a.ts:aws_access_key',
      'a.ts:high_entropy_token',
      'b.ts:slack_token',
    ]);
  });

  it('treats clean text as empty findings', () => {
    expect(detectSecretsInText('clean.ts', 'export const x = 1;\n')).toEqual(
      [],
    );
  });
});
