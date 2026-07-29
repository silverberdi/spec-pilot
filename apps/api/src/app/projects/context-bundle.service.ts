import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type {
  ContextBundleLatestListDto,
  ContextBundleOkDto,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
  CONTEXT_BUNDLE_SELECTION_POLICY_ID,
  CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
  isContextSourceResolveBlockedCode,
  parseContextBundleLatestQuery,
  parseContextBundleRequest,
} from '@specpilot/shared-contracts';
import { ContextSourceResolutionService } from './context-source-resolution.service';
import { runContextScanPipeline } from './context-scan-pipeline';
import {
  buildEntryFromCleanBytes,
  buildExclusions,
  computeManifestHash,
} from './context-bundle-manifest';
import {
  blocked422,
  internal500,
  notFound404,
  OPERATOR_MESSAGES,
  ProjectHttpError,
} from './project-errors';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ContextBundleService {
  private readonly logger = new Logger(ContextBundleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextSources: ContextSourceResolutionService,
  ) {}

  async create(projectId: string, body: unknown): Promise<ContextBundleOkDto> {
    const parsed = parseContextBundleRequest(body);
    if (!parsed.ok) {
      throw blocked422('invalid_review_stage');
    }
    const stage = parsed.request.stage;

    let resolveOk;
    try {
      resolveOk = await this.contextSources.resolve(projectId, { stage });
    } catch (error: unknown) {
      this.rethrowResolveAsBundle(projectId, stage, error);
      throw error;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { repositoryPath: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    let pipeline;
    try {
      pipeline = await runContextScanPipeline({
        projectId,
        stage,
        resolveOk,
        repositoryRoot: project.repositoryPath,
        includeCleanBytes: true,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Context scan pipeline failed for ${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('context_bundle_failed');
    }

    try {
      const cleanFiles = pipeline.cleanFiles ?? [];
      const entries = cleanFiles.map(({ path, bytes }) =>
        buildEntryFromCleanBytes(path, bytes),
      );
      const exclusions = buildExclusions({
        findings: pipeline.findings,
        unscannable: pipeline.unscannable,
      });
      const totalTokenEstimate = entries.reduce(
        (sum, entry) => sum + entry.tokenEstimate,
        0,
      );
      const manifestHash = computeManifestHash({
        manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
        projectId: pipeline.projectId,
        configurationVersionId: pipeline.configurationVersionId,
        stage: pipeline.stage,
        sourceHash: pipeline.sourceHash,
        selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
        tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
        entries,
        exclusions,
        candidatePathCount: pipeline.candidatePathCount,
        eligiblePathCount: entries.length,
        excludedPathCount: exclusions.length,
        findingCount: pipeline.findings.length,
        unscannableCount: pipeline.unscannable.length,
        totalTokenEstimate,
      });

      const row = await this.prisma.contextBundle.create({
        data: {
          projectId: pipeline.projectId,
          configurationVersionId: pipeline.configurationVersionId,
          stage: pipeline.stage,
          sourceHash: pipeline.sourceHash,
          manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
          selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
          tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
          manifestHash,
          entryCount: entries.length,
          totalTokenEstimate,
          candidatePathCount: pipeline.candidatePathCount,
          eligiblePathCount: entries.length,
          excludedPathCount: exclusions.length,
          findingCount: pipeline.findings.length,
          unscannableCount: pipeline.unscannable.length,
          entries,
          exclusions,
        },
      });

      return this.toOkDto(row);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Context bundle create failed for ${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('context_bundle_failed');
    }
  }

  async get(projectId: string, bundleId: string): Promise<ContextBundleOkDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    const row = await this.prisma.contextBundle.findFirst({
      where: { id: bundleId, projectId },
    });
    if (!row) {
      throw notFound404('context_bundle_not_found');
    }

    return this.toOkDto(row);
  }

  async latest(
    projectId: string,
    query: Record<string, unknown>,
  ): Promise<ContextBundleLatestListDto> {
    const parsed = parseContextBundleLatestQuery(query);
    if (!parsed.ok) {
      throw blocked422('invalid_context_bundle_query');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    const rows = await this.prisma.contextBundle.findMany({
      where: { projectId, stage: parsed.stage },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 1,
    });

    return {
      status: 'ok',
      items: rows.map((row) => this.toOkDto(row)),
    };
  }

  private toOkDto(row: {
    id: string;
    projectId: string;
    configurationVersionId: string;
    stage: string;
    sourceHash: string;
    createdAt: Date;
    manifestSchemaVersion: number;
    selectionPolicyId: string;
    tokenEstimatorId: string;
    manifestHash: string;
    entryCount: number;
    totalTokenEstimate: number;
    candidatePathCount: number;
    eligiblePathCount: number;
    excludedPathCount: number;
    findingCount: number;
    unscannableCount: number;
    entries: unknown;
    exclusions: unknown;
  }): ContextBundleOkDto {
    return {
      status: 'ok',
      id: row.id,
      projectId: row.projectId,
      stage: row.stage as ReviewStage,
      configurationVersionId: row.configurationVersionId,
      sourceHash: row.sourceHash,
      createdAt: row.createdAt.toISOString(),
      manifestSchemaVersion: CONTEXT_BUNDLE_MANIFEST_SCHEMA_VERSION,
      selectionPolicyId: CONTEXT_BUNDLE_SELECTION_POLICY_ID,
      tokenEstimatorId: CONTEXT_BUNDLE_TOKEN_ESTIMATOR_ID,
      manifestHash: row.manifestHash,
      entryCount: row.entryCount,
      totalTokenEstimate: row.totalTokenEstimate,
      candidatePathCount: row.candidatePathCount,
      eligiblePathCount: row.eligiblePathCount,
      excludedPathCount: row.excludedPathCount,
      findingCount: row.findingCount,
      unscannableCount: row.unscannableCount,
      entries: row.entries as ContextBundleOkDto['entries'],
      exclusions: row.exclusions as ContextBundleOkDto['exclusions'],
    };
  }

  private rethrowResolveAsBundle(
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
          throw new ProjectHttpError(
            HttpStatus.UNPROCESSABLE_ENTITY,
            code,
            OPERATOR_MESSAGES[code],
            {
              status: 'blocked',
              projectId,
              stage:
                typeof record['stage'] === 'string' || record['stage'] === null
                  ? (record['stage'] as ReviewStage | null)
                  : stage,
              code,
              message: OPERATOR_MESSAGES[code],
            },
          );
        }
      }
    }
  }
}
