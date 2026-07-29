import { HttpStatus } from '@nestjs/common';
import type {
  ContextSourceResolveOkDto,
  ReviewStage,
  SecretFindingDto,
  SecretScanBlockedCode,
  SecretScanBlockedDto,
  UnscannablePathDto,
} from '@specpilot/shared-contracts';
import { SECRET_SCAN_TIMEOUT_MS } from '@specpilot/shared-contracts';
import { OPERATOR_MESSAGES, ProjectHttpError } from './project-errors';
import { detectSecretsInText, sortFindings } from './secret-detectors';
import { readCandidateForSecretScan } from './secret-scan-reader';

export type ContextScanCleanFile = {
  path: string;
  bytes: Buffer;
};

export type ContextScanPipelineResult = {
  projectId: string;
  stage: ReviewStage;
  configurationVersionId: string;
  sourceHash: string;
  candidatePathCount: number;
  eligiblePathCount: number;
  eligiblePaths: string[];
  findings: SecretFindingDto[];
  unscannable: UnscannablePathDto[];
  cleanFiles?: ContextScanCleanFile[];
};

function blockedScan(
  projectId: string,
  stage: ReviewStage,
  code: SecretScanBlockedCode,
  counts?: {
    candidatePathCount: number;
    findingCount: number;
    unscannableCount: number;
  },
): never {
  const body: SecretScanBlockedDto = {
    status: 'blocked',
    projectId,
    stage,
    code,
    message: OPERATOR_MESSAGES[code],
    ...(code === 'unsafe_context_bundle' && counts
      ? {
          candidatePathCount: counts.candidatePathCount,
          findingCount: counts.findingCount,
          unscannableCount: counts.unscannableCount,
        }
      : {}),
  };
  throw new ProjectHttpError(
    HttpStatus.UNPROCESSABLE_ENTITY,
    code,
    body.message,
    body,
  );
}

/**
 * Shared resolve → open/read once → classify → detect pipeline.
 * When includeCleanBytes is true, clean files retain the exact read Buffer
 * for trusted in-process consumers (context bundle create).
 */
export async function runContextScanPipeline(options: {
  projectId: string;
  stage: ReviewStage;
  resolveOk: ContextSourceResolveOkDto;
  repositoryRoot: string;
  includeCleanBytes: boolean;
}): Promise<ContextScanPipelineResult> {
  const { projectId, stage, resolveOk, repositoryRoot, includeCleanBytes } =
    options;

  const scanStartedAt = Date.now();
  let totalBytesRead = 0;
  const findings: SecretFindingDto[] = [];
  const unscannable: UnscannablePathDto[] = [];
  const excluded = new Set<string>();
  const cleanFiles: ContextScanCleanFile[] = [];

  for (const relativePath of resolveOk.paths) {
    if (Date.now() - scanStartedAt >= SECRET_SCAN_TIMEOUT_MS) {
      blockedScan(projectId, stage, 'secret_scan_timeout');
    }

    const read = await readCandidateForSecretScan({
      repositoryRoot,
      relativePath,
      totalBytesRead,
      scanStartedAt,
    });

    if (!read.ok) {
      blockedScan(projectId, stage, read.code);
    }

    totalBytesRead += read.bytesRead;

    if (read.kind === 'unscannable') {
      unscannable.push({
        path: relativePath,
        reason: 'unscannable_content',
      });
      excluded.add(relativePath);
      continue;
    }

    if (Date.now() - scanStartedAt >= SECRET_SCAN_TIMEOUT_MS) {
      blockedScan(projectId, stage, 'secret_scan_timeout');
    }

    const fileFindings = detectSecretsInText(relativePath, read.text);
    if (fileFindings.length > 0) {
      findings.push(...fileFindings);
      excluded.add(relativePath);
      continue;
    }

    if (includeCleanBytes) {
      cleanFiles.push({ path: relativePath, bytes: read.bytes });
    }
  }

  const eligiblePaths = resolveOk.paths.filter((path) => !excluded.has(path));
  const sortedFindings = sortFindings(findings);
  const sortedUnscannable = unscannable
    .slice()
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  if (resolveOk.pathCount >= 1 && eligiblePaths.length === 0) {
    blockedScan(projectId, stage, 'unsafe_context_bundle', {
      candidatePathCount: resolveOk.pathCount,
      findingCount: sortedFindings.length,
      unscannableCount: sortedUnscannable.length,
    });
  }

  return {
    projectId: resolveOk.projectId,
    stage: resolveOk.stage,
    configurationVersionId: resolveOk.configurationVersionId,
    sourceHash: resolveOk.sourceHash,
    candidatePathCount: resolveOk.pathCount,
    eligiblePathCount: eligiblePaths.length,
    eligiblePaths,
    findings: sortedFindings,
    unscannable: sortedUnscannable,
    cleanFiles: includeCleanBytes ? cleanFiles : undefined,
  };
}
