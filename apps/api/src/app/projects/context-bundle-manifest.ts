import { createHash } from 'node:crypto';
import type {
  ContextBundleEntryDto,
  ContextBundleExclusionDto,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  CONTEXT_BUNDLE_SELECTION_POLICY_ID,
  CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
} from '@specpilot/shared-contracts';

export function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function decodeCleanText(bytes: Buffer): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function lineRangesFromText(
  text: string,
  byteLength: number,
): Array<{ startLine: number; endLine: number }> {
  if (byteLength === 0) {
    return [];
  }
  return [{ startLine: 1, endLine: text.split('\n').length }];
}

export function estimateTokens(text: string, byteLength: number): number {
  if (byteLength === 0) {
    return 0;
  }
  const codePointCount = [...text].length;
  return codePointCount === 0 ? 0 : Math.ceil(codePointCount / 4);
}

export type ManifestHashInput = {
  manifestSchemaVersion: typeof CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION;
  projectId: string;
  configurationVersionId: string;
  stage: ReviewStage;
  sourceHash: string;
  selectionPolicyId: typeof CONTEXT_BUNDLE_SELECTION_POLICY_ID;
  tokenEstimatorId: typeof CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID;
  entries: ContextBundleEntryDto[];
  exclusions: ContextBundleExclusionDto[];
  candidatePathCount: number;
  eligiblePathCount: number;
  excludedPathCount: number;
  findingCount: number;
  unscannableCount: number;
  totalTokenEstimate: number;
};

export function buildCanonicalManifestObject(
  input: ManifestHashInput,
): Record<string, unknown> {
  return {
    manifestSchemaVersion: input.manifestSchemaVersion,
    projectId: input.projectId,
    configurationVersionId: input.configurationVersionId,
    stage: input.stage,
    sourceHash: input.sourceHash,
    selectionPolicyId: input.selectionPolicyId,
    tokenEstimatorId: input.tokenEstimatorId,
    entries: input.entries.map((entry) => ({
      path: entry.path,
      contentHash: entry.contentHash,
      lineRanges: entry.lineRanges.map((range) => ({
        startLine: range.startLine,
        endLine: range.endLine,
      })),
      tokenEstimate: entry.tokenEstimate,
    })),
    exclusions: input.exclusions.map((exclusion) => ({
      path: exclusion.path,
      reason: exclusion.reason,
    })),
    candidatePathCount: input.candidatePathCount,
    eligiblePathCount: input.eligiblePathCount,
    excludedPathCount: input.excludedPathCount,
    findingCount: input.findingCount,
    unscannableCount: input.unscannableCount,
    totalTokenEstimate: input.totalTokenEstimate,
  };
}

export function computeManifestHash(input: ManifestHashInput): string {
  const canonical = buildCanonicalManifestObject(input);
  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json, 'utf8').digest('hex');
}

export function buildEntryFromCleanBytes(
  path: string,
  bytes: Buffer,
): ContextBundleEntryDto {
  const contentHash = hashBytes(bytes);
  const text = decodeCleanText(bytes);
  const lineRanges = lineRangesFromText(text, bytes.byteLength);
  const tokenEstimate = estimateTokens(text, bytes.byteLength);
  return { path, contentHash, lineRanges, tokenEstimate };
}

export function buildExclusions(options: {
  findings: Array<{ path: string }>;
  unscannable: Array<{ path: string }>;
}): ContextBundleExclusionDto[] {
  const exclusions: ContextBundleExclusionDto[] = [];
  const secretPaths = new Set<string>();
  for (const finding of options.findings) {
    if (!secretPaths.has(finding.path)) {
      secretPaths.add(finding.path);
      exclusions.push({ path: finding.path, reason: 'secret_finding' });
    }
  }
  for (const item of options.unscannable) {
    exclusions.push({ path: item.path, reason: 'unscannable_content' });
  }
  return exclusions.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
