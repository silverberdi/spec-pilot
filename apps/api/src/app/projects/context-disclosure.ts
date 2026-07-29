import { createHash } from 'node:crypto';
import { PREVIEW_POLICY_ID } from '@specpilot/shared-contracts';
import { hashBytes } from './context-bundle-manifest';

/**
 * w02-s04 design D4: canonical excerpt extraction over already hash-verified,
 * fatal-UTF-8-decoded bytes. Never normalizes CRLF/LF; `text.split('\n')` is
 * used only to map 1-based inclusive line ranges to segments.
 */
export type ExtractExcerptResult = { ok: true; excerpt: string } | { ok: false };

export function extractExcerpt(
  text: string,
  lineRanges: ReadonlyArray<{ startLine: number; endLine: number }>,
  byteLength: number,
): ExtractExcerptResult {
  if (byteLength === 0) {
    return lineRanges.length === 0 ? { ok: true, excerpt: '' } : { ok: false };
  }
  if (lineRanges.length === 0) {
    return { ok: false };
  }

  const lines = text.split('\n');
  const lineCount = lines.length;

  let previousEndLine = 0;
  for (const range of lineRanges) {
    if (
      !Number.isInteger(range.startLine) ||
      !Number.isInteger(range.endLine) ||
      range.startLine < 1 ||
      range.endLine < range.startLine ||
      range.endLine > lineCount ||
      range.startLine <= previousEndLine
    ) {
      return { ok: false };
    }
    previousEndLine = range.endLine;
  }

  // Binding full-file rule: exact decoded text, bit-exact CR/LF fidelity.
  if (
    lineRanges.length === 1 &&
    lineRanges[0].startLine === 1 &&
    lineRanges[0].endLine === lineCount
  ) {
    return { ok: true, excerpt: text };
  }

  const segments = lineRanges.map((range) =>
    lines.slice(range.startLine - 1, range.endLine).join('\n'),
  );
  return { ok: true, excerpt: segments.join('\n') };
}

/** Unicode code-point count (not UTF-16 code units); used for D8 bounds. */
export function codePointCount(text: string): number {
  return [...text].length;
}

export type PreviewIntegrityHashItemInput = {
  path: string;
  contentHash: string;
  lineRanges: ReadonlyArray<{ startLine: number; endLine: number }>;
  excerpt: string;
};

export type PreviewIntegrityHashInput = {
  projectId: string;
  contextBundleId: string;
  manifestHash: string;
  items: ReadonlyArray<PreviewIntegrityHashItemInput>;
};

/**
 * w02-s04 design D5: lowercase SHA-256 over compact canonical JSON built in
 * exact binding key order. `createdAt`/`expiresAt`/`previewSessionId` are
 * excluded; `excerptHash` digests exact UTF-8 excerpt bytes, never the
 * excerpt itself.
 */
export function buildPreviewIntegrityHashObject(
  input: PreviewIntegrityHashInput,
): Record<string, unknown> {
  return {
    previewPolicyId: PREVIEW_POLICY_ID,
    projectId: input.projectId,
    contextBundleId: input.contextBundleId,
    manifestHash: input.manifestHash,
    items: input.items.map((item) => ({
      path: item.path,
      contentHash: item.contentHash,
      lineRanges: item.lineRanges.map((range) => ({
        startLine: range.startLine,
        endLine: range.endLine,
      })),
      excerptHash: hashBytes(Buffer.from(item.excerpt, 'utf8')),
    })),
  };
}

export function computePreviewIntegrityHash(
  input: PreviewIntegrityHashInput,
): string {
  const canonical = buildPreviewIntegrityHashObject(input);
  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json, 'utf8').digest('hex');
}

/**
 * w02-s04 design D3: coverage fingerprint fields compared with exact
 * equality, including both binding policy ids.
 */
export type CoverageFingerprint = {
  projectId: string;
  stage: string;
  manifestHash: string;
  sourceHash: string;
  manifestSchemaVersion: number;
  selectionPolicyId: string;
  tokenEstimatorId: string;
  previewPolicyId: string;
  approvalPolicyId: string;
};

export function coverageMatches(
  a: CoverageFingerprint,
  b: CoverageFingerprint,
): boolean {
  return (
    a.projectId === b.projectId &&
    a.stage === b.stage &&
    a.manifestHash === b.manifestHash &&
    a.sourceHash === b.sourceHash &&
    a.manifestSchemaVersion === b.manifestSchemaVersion &&
    a.selectionPolicyId === b.selectionPolicyId &&
    a.tokenEstimatorId === b.tokenEstimatorId &&
    a.previewPolicyId === b.previewPolicyId &&
    a.approvalPolicyId === b.approvalPolicyId
  );
}

export function isApprovalCovering(
  approval: CoverageFingerprint & { decision: string },
  candidate: CoverageFingerprint,
): boolean {
  return approval.decision === 'approved' && coverageMatches(approval, candidate);
}
