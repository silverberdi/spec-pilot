import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type {
  ReviewStage,
  SecretScanBlockedCode,
  SecretScanBlockedDto,
  SecretScanOkDto,
} from '@specpilot/shared-contracts';
import {
  isContextSourceResolveBlockedCode,
  parseSecretScanRequest,
} from '@specpilot/shared-contracts';
import { ContextSourceResolutionService } from './context-source-resolution.service';
import { runContextScanPipeline } from './context-scan-pipeline';
import {
  internal500,
  notFound404,
  OPERATOR_MESSAGES,
  ProjectHttpError,
} from './project-errors';
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

    try {
      const pipeline = await runContextScanPipeline({
        projectId,
        stage,
        resolveOk,
        repositoryRoot: project.repositoryPath,
        includeCleanBytes: false,
      });

      return {
        status: 'ok',
        projectId: pipeline.projectId,
        stage: pipeline.stage,
        configurationVersionId: pipeline.configurationVersionId,
        sourceHash: pipeline.sourceHash,
        scannedAt: new Date().toISOString(),
        candidatePathCount: pipeline.candidatePathCount,
        eligiblePathCount: pipeline.eligiblePathCount,
        eligiblePaths: pipeline.eligiblePaths,
        findings: pipeline.findings,
        unscannable: pipeline.unscannable,
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
