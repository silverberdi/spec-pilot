import {
  buildCanonicalManifestObject,
  computeManifestHash,
  estimateTokens,
  hashBytes,
  lineRangesFromText,
} from './context-bundle-manifest';
import {
  CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  CONTEXT_BUNDLE_SELECTION_POLICY_ID,
  CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
} from '@specpilot/shared-contracts';

describe('context-bundle-manifest', () => {
  it('hashBytes produces lowercase sha-256 hex', () => {
    expect(hashBytes(Buffer.alloc(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    const known = Buffer.from('hello', 'utf8');
    expect(hashBytes(known)).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('lineRangesFromText follows binding split semantics', () => {
    expect(lineRangesFromText('', 0)).toEqual([]);
    expect(lineRangesFromText('a\nb', 3)).toEqual([
      { startLine: 1, endLine: 2 },
    ]);
    expect(lineRangesFromText('a\nb\n', 4)).toEqual([
      { startLine: 1, endLine: 3 },
    ]);
  });

  it('estimateTokens uses unicode code points ceil(/4)', () => {
    expect(estimateTokens('', 0)).toBe(0);
    expect(estimateTokens('abcd', 4)).toBe(1);
    expect(estimateTokens('abcde', 5)).toBe(2);
    expect(estimateTokens('ñ', Buffer.from('ñ', 'utf8').byteLength)).toBe(1);
    expect(estimateTokens('😀', Buffer.from('😀', 'utf8').byteLength)).toBe(1);
  });

  it('computeManifestHash is stable and sensitive to material changes', () => {
    const base = {
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      projectId: '11111111-1111-1111-1111-111111111111',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      stage: 'planning' as const,
      sourceHash: 'a'.repeat(64),
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      entries: [
        {
          path: 'AGENTS.md',
          contentHash: 'b'.repeat(64),
          lineRanges: [{ startLine: 1, endLine: 1 }],
          tokenEstimate: 1,
        },
      ],
      exclusions: [] as Array<{ path: string; reason: 'unscannable_content' }>,
      candidatePathCount: 1,
      eligiblePathCount: 1,
      excludedPathCount: 0,
      findingCount: 0,
      unscannableCount: 0,
      totalTokenEstimate: 1,
    };

    const first = computeManifestHash(base);
    const second = computeManifestHash(base);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);

    const withExclusion = computeManifestHash({
      ...base,
      exclusions: [{ path: 'big.txt', reason: 'unscannable_content' }],
      excludedPathCount: 1,
      unscannableCount: 1,
    });
    expect(withExclusion).not.toBe(first);

    const withPolicy = computeManifestHash({
      ...base,
      selectionPolicyId: 'other-policy' as typeof CONTEXT_BUNDLE_SELECTION_POLICY_ID,
    });
    expect(withPolicy).not.toBe(first);

    const reorderedEntries = computeManifestHash({
      ...base,
      entries: [
        {
          path: 'README.md',
          contentHash: 'c'.repeat(64),
          lineRanges: [{ startLine: 1, endLine: 2 }],
          tokenEstimate: 2,
        },
        ...base.entries,
      ],
      eligiblePathCount: 2,
      totalTokenEstimate: 3,
    });
    expect(reorderedEntries).not.toBe(first);
  });

  it('buildCanonicalManifestObject uses compact binding key order', () => {
    const canonical = buildCanonicalManifestObject({
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      projectId: 'p',
      configurationVersionId: 'c',
      stage: 'new',
      sourceHash: 's',
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      entries: [],
      exclusions: [],
      candidatePathCount: 0,
      eligiblePathCount: 0,
      excludedPathCount: 0,
      findingCount: 0,
      unscannableCount: 0,
      totalTokenEstimate: 0,
    });
    expect(Object.keys(canonical)).toEqual([
      'manifestSchemaVersion',
      'projectId',
      'configurationVersionId',
      'stage',
      'sourceHash',
      'selectionPolicyId',
      'tokenEstimatorId',
      'entries',
      'exclusions',
      'candidatePathCount',
      'eligiblePathCount',
      'excludedPathCount',
      'findingCount',
      'unscannableCount',
      'totalTokenEstimate',
    ]);
    expect(JSON.stringify(canonical)).not.toMatch(/\s/);
  });
});
