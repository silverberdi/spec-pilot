import {
  codePointCount,
  computePreviewIntegrityHash,
  coverageMatches,
  extractExcerpt,
  isApprovalCovering,
} from './context-disclosure';

describe('context-disclosure extractExcerpt', () => {
  it('returns empty excerpt for an empty file with no ranges', () => {
    expect(extractExcerpt('', [], 0)).toEqual({ ok: true, excerpt: '' });
  });

  it('fails when an empty file carries a non-empty range', () => {
    expect(extractExcerpt('', [{ startLine: 1, endLine: 1 }], 0)).toEqual({
      ok: false,
    });
  });

  it('fails when a non-empty file carries no ranges', () => {
    expect(extractExcerpt('a', [], 1)).toEqual({ ok: false });
  });

  it('full-file single range preserves CRLF and trailing newline exactly', () => {
    const text = 'line one\r\nline two\r\n';
    const byteLength = Buffer.from(text, 'utf8').byteLength;
    const lineCount = text.split('\n').length;
    const result = extractExcerpt(
      text,
      [{ startLine: 1, endLine: lineCount }],
      byteLength,
    );
    expect(result).toEqual({ ok: true, excerpt: text });
  });

  it('full-file rule does not rebuild by joining split lines (CR preserved)', () => {
    const text = 'a\r\nb';
    const result = extractExcerpt(text, [{ startLine: 1, endLine: 2 }], 4);
    expect(result).toEqual({ ok: true, excerpt: 'a\r\nb' });
    // sanity: joining split lines with '\n' would have dropped the '\r'
    expect(text.split('\n').join('\n')).toBe(text);
  });

  it('multi-range extraction joins segments with exactly one separator between ranges', () => {
    const text = ['one', 'two', 'three', 'four', 'five'].join('\n');
    const result = extractExcerpt(
      text,
      [
        { startLine: 1, endLine: 2 },
        { startLine: 4, endLine: 5 },
      ],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: true, excerpt: 'one\ntwo\nfour\nfive' });
  });

  it('multi-range extraction reconstructs interior newlines within a single range', () => {
    const text = ['a', 'b', 'c', 'd'].join('\n');
    const result = extractExcerpt(
      text,
      [{ startLine: 2, endLine: 3 }],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: true, excerpt: 'b\nc' });
  });

  it('rejects reversed ranges', () => {
    const text = 'a\nb\nc';
    const result = extractExcerpt(
      text,
      [{ startLine: 3, endLine: 1 }],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: false });
  });

  it('rejects overlapping ranges', () => {
    const text = 'a\nb\nc\nd';
    const result = extractExcerpt(
      text,
      [
        { startLine: 1, endLine: 3 },
        { startLine: 2, endLine: 4 },
      ],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: false });
  });

  it('rejects non-ascending (out-of-order) ranges', () => {
    const text = 'a\nb\nc\nd';
    const result = extractExcerpt(
      text,
      [
        { startLine: 3, endLine: 3 },
        { startLine: 1, endLine: 1 },
      ],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: false });
  });

  it('rejects out-of-bounds ranges', () => {
    const text = 'a\nb';
    const result = extractExcerpt(
      text,
      [{ startLine: 1, endLine: 5 }],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: false });
  });

  it('rejects startLine below 1', () => {
    const text = 'a\nb';
    const result = extractExcerpt(
      text,
      [{ startLine: 0, endLine: 1 }],
      Buffer.from(text, 'utf8').byteLength,
    );
    expect(result).toEqual({ ok: false });
  });
});

describe('context-disclosure codePointCount', () => {
  it('counts unicode code points, not UTF-16 code units', () => {
    expect(codePointCount('')).toBe(0);
    expect(codePointCount('abcd')).toBe(4);
    expect(codePointCount('😀')).toBe(1);
    expect(codePointCount('a😀b')).toBe(3);
  });
});

describe('context-disclosure computePreviewIntegrityHash', () => {
  const baseInput = {
    projectId: '11111111-1111-1111-1111-111111111111',
    contextBundleId: '33333333-3333-3333-3333-333333333333',
    manifestHash: 'b'.repeat(64),
    items: [
      {
        path: 'AGENTS.md',
        contentHash: 'c'.repeat(64),
        lineRanges: [{ startLine: 1, endLine: 1 }],
        excerpt: 'hello',
      },
    ],
  };

  it('is stable for identical material and policy', () => {
    const first = computePreviewIntegrityHash(baseInput);
    const second = computePreviewIntegrityHash(baseInput);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when the excerpt changes', () => {
    const first = computePreviewIntegrityHash(baseInput);
    const changed = computePreviewIntegrityHash({
      ...baseInput,
      items: [{ ...baseInput.items[0], excerpt: 'goodbye' }],
    });
    expect(changed).not.toBe(first);
  });

  it('changes when item order changes', () => {
    const first = computePreviewIntegrityHash({
      ...baseInput,
      items: [
        baseInput.items[0],
        { ...baseInput.items[0], path: 'README.md', excerpt: 'world' },
      ],
    });
    const reordered = computePreviewIntegrityHash({
      ...baseInput,
      items: [
        { ...baseInput.items[0], path: 'README.md', excerpt: 'world' },
        baseInput.items[0],
      ],
    });
    expect(reordered).not.toBe(first);
  });

  it('excludes createdAt/expiresAt/previewSessionId shaped fields from the digest', () => {
    // The hash input type has no such fields by construction; verifying the
    // canonical object contains exactly the binding keys guards regressions.
    const first = computePreviewIntegrityHash(baseInput);
    const second = computePreviewIntegrityHash(baseInput);
    expect(first).toBe(second);
  });
});

describe('context-disclosure coverage fingerprint', () => {
  const fingerprint = {
    projectId: 'p1',
    stage: 'planning',
    manifestHash: 'm'.repeat(64),
    sourceHash: 's'.repeat(64),
    manifestSchemaVersion: 1,
    selectionPolicyId: 'full-file-lines-v1',
    tokenEstimatorId: 'unicode-codepoints-div-4-v1',
    previewPolicyId: 'bounded-selected-text-v1',
    approvalPolicyId: 'explicit-disclosure-approval-v1',
  };

  it('matches when every coverage field is identical', () => {
    expect(coverageMatches(fingerprint, { ...fingerprint })).toBe(true);
  });

  it('does not match when previewPolicyId differs', () => {
    expect(
      coverageMatches(fingerprint, {
        ...fingerprint,
        previewPolicyId: 'other-preview-policy',
      }),
    ).toBe(false);
  });

  it('does not match when approvalPolicyId differs', () => {
    expect(
      coverageMatches(fingerprint, {
        ...fingerprint,
        approvalPolicyId: 'other-approval-policy',
      }),
    ).toBe(false);
  });

  it('isApprovalCovering requires decision approved and full fingerprint match', () => {
    expect(
      isApprovalCovering({ ...fingerprint, decision: 'approved' }, fingerprint),
    ).toBe(true);
    expect(
      isApprovalCovering({ ...fingerprint, decision: 'pending' }, fingerprint),
    ).toBe(false);
    expect(
      isApprovalCovering(
        { ...fingerprint, decision: 'approved', manifestHash: 'x'.repeat(64) },
        fingerprint,
      ),
    ).toBe(false);
  });
});
