import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type {
  ReviewStage,
  SecretFindingDto,
  SecretScanBlockedCode,
  SecretScanBlockedDto,
  SecretScanOkDto,
  UnscannablePathDto,
} from '@specpilot/shared-contracts';
import {
  isContextSourceResolveBlockedCode,
  parseSecretScanRequest,
  SECRET_SCAN_TIMEOUT_MS,
} from '@specpilot/shared-contracts';
import { ContextSourceResolutionService } from './context-source-resolution.service';
import {
  internal500,
  notFound404,
  OPERATOR_MESSAGES,
  ProjectHttpError,
} from './project-errors';
import { detectSecretsInText, sortFindings } from './secret-detectors';
import { readCandidateForSecretScan } from './secret-scan-reader';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SecretDetectionService {
  private readonly logger = new Logger(SecretDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextSources: ContextSourceResolutionService,
  ) {}

  async scan(projectId: string, body: unknown): Promise<SecretScanOkDto> {
    const parsed = parseSecretScanRequest(body);
    if (!parsed.ok) {
      throw this.blockedScan(projectId, null, 'invalid_review_stage');
    }
    const stage = parsed.request.stage;

    let resolveOk;
    try {
      resolveOk = await this.contextSources.resolve(projectId, { stage });
    } catch (error: unknown) {
      this.rethrowResolveAsScan(projectId, stage, error);
      throw error;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { repositoryPath: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }
    const repositoryRoot = project.repositoryPath;

    const scanStartedAt = Date.now();
    let totalBytesRead = 0;
    const findings: SecretFindingDto[] = [];
    const unscannable: UnscannablePathDto[] = [];
    const excluded = new Set<string>();

    try {
      for (const relativePath of resolveOk.paths) {
        if (Date.now() - scanStartedAt >= SECRET_SCAN_TIMEOUT_MS) {
          throw this.blockedScan(projectId, stage, 'secret_scan_timeout');
        }

        const read = await readCandidateForSecretScan({
          repositoryRoot,
          relativePath,
          totalBytesRead,
          scanStartedAt,
        });

        if (!read.ok) {
          throw this.blockedScan(projectId, stage, read.code);
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
          throw this.blockedScan(projectId, stage, 'secret_scan_timeout');
        }

        const fileFindings = detectSecretsInText(relativePath, read.text);
        if (fileFindings.length > 0) {
          findings.push(...fileFindings);
          excluded.add(relativePath);
        }
      }

      const eligiblePaths = resolveOk.paths.filter(
        (path) => !excluded.has(path),
      );
      const sortedFindings = sortFindings(findings);
      const sortedUnscannable = unscannable
        .slice()
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

      if (resolveOk.pathCount >= 1 && eligiblePaths.length === 0) {
        throw this.blockedScan(projectId, stage, 'unsafe_context_bundle', {
          candidatePathCount: resolveOk.pathCount,
          findingCount: sortedFindings.length,
          unscannableCount: sortedUnscannable.length,
        });
      }

      return {
        status: 'ok',
        projectId: resolveOk.projectId,
        stage: resolveOk.stage,
        configurationVersionId: resolveOk.configurationVersionId,
        sourceHash: resolveOk.sourceHash,
        scannedAt: new Date().toISOString(),
        candidatePathCount: resolveOk.pathCount,
        eligiblePathCount: eligiblePaths.length,
        eligiblePaths,
        findings: sortedFindings,
        unscannable: sortedUnscannable,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Secret scan failed for ${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('secret_scan_failed');
    }
  }

  private rethrowResolveAsScan(
    projectId: string,
    stage: ReviewStage,
    error: unknown,
  ): void {
    if (!(error instanceof HttpException)) {
      return;
    }
    const status = error.getStatus();
    const response = error.getResponse();
    if (status === HttpStatus.NOT_FOUND) {
      throw error;
    }
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Resolve unexpected failures stay as context_resolve_failed.
      throw error;
    }
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      if (typeof response === 'object' && response !== null) {
        const record = response as Record<string, unknown>;
        const code = record['code'];
        if (
          typeof code === 'string' &&
          isContextSourceResolveBlockedCode(code)
        ) {
          throw this.blockedScan(
            projectId,
            typeof record['stage'] === 'string' || record['stage'] === null
              ? (record['stage'] as ReviewStage | null)
              : stage,
            code,
          );
        }
      }
    }
  }

  private blockedScan(
    projectId: string,
    stage: ReviewStage | null,
    code: SecretScanBlockedCode,
    counts?: {
      candidatePathCount: number;
      findingCount: number;
      unscannableCount: number;
    },
  ): ProjectHttpError {
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
    return new ProjectHttpError(
      HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      body.message,
      body,
    );
  }
}
