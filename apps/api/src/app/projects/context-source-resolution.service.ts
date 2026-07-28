import { access, constants, stat } from 'node:fs/promises';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type {
  ContextSourceResolveBlockedCode,
  ContextSourceResolveBlockedDto,
  ContextSourceResolveDto,
  ContextSourceResolveOkDto,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  parseContextSourceResolveRequest,
} from '@specpilot/shared-contracts';
import { PrismaService } from '../prisma.service';
import {
  buildEffectiveExcludes,
  validateContextPatterns,
  walkContextSources,
} from './context-source-walker';
import {
  internal500,
  notFound404,
  OPERATOR_MESSAGES,
  ProjectHttpError,
} from './project-errors';

@Injectable()
export class ContextSourceResolutionService {
  private readonly logger = new Logger(ContextSourceResolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    projectId: string,
    body: unknown,
  ): Promise<ContextSourceResolveOkDto> {
    const parsedStage = parseContextSourceResolveRequest(body);
    if (!parsedStage.ok) {
      throw this.blockedResolve(projectId, null, 'invalid_review_stage');
    }
    const stage = parsedStage.request.stage;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { activeConfiguration: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    if (
      project.configurationVersionId == null ||
      project.activeConfiguration == null
    ) {
      throw this.blockedResolve(projectId, stage, 'configuration_not_found');
    }

    await this.assertRepositoryHardPath(project.repositoryPath, projectId, stage);

    const normalized = project.activeConfiguration.normalizedConfig;
    if (
      typeof normalized !== 'object' ||
      normalized === null ||
      Array.isArray(normalized)
    ) {
      throw this.blockedResolve(projectId, stage, 'invalid_context_patterns');
    }
    const context = (normalized as Record<string, unknown>)['context'];
    if (typeof context !== 'object' || context === null || Array.isArray(context)) {
      throw this.blockedResolve(projectId, stage, 'invalid_context_patterns');
    }
    const includeRaw = (context as Record<string, unknown>)['include'];
    const excludeRaw = (context as Record<string, unknown>)['exclude'];
    if (!Array.isArray(includeRaw) || !Array.isArray(excludeRaw)) {
      throw this.blockedResolve(projectId, stage, 'invalid_context_patterns');
    }
    if (
      !includeRaw.every((item) => typeof item === 'string') ||
      !excludeRaw.every((item) => typeof item === 'string')
    ) {
      throw this.blockedResolve(projectId, stage, 'invalid_context_patterns');
    }

    const include = includeRaw as string[];
    const snapshotExclude = excludeRaw as string[];
    const exclude = buildEffectiveExcludes(snapshotExclude);

    const patternCheck = validateContextPatterns(include, exclude);
    if (!patternCheck.ok) {
      throw this.blockedResolve(projectId, stage, patternCheck.code);
    }

    try {
      const walk = await walkContextSources({
        repositoryRoot: project.repositoryPath,
        include,
        exclude,
      });
      if (!walk.ok) {
        throw this.blockedResolve(projectId, stage, walk.code);
      }

      const dto: ContextSourceResolveOkDto = {
        status: 'ok',
        projectId: project.id,
        stage,
        configurationVersionId: project.activeConfiguration.id,
        sourceHash: project.activeConfiguration.sourceHash,
        resolvedAt: new Date().toISOString(),
        include,
        exclude,
        pathCount: walk.paths.length,
        paths: walk.paths,
      };
      return dto;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Context source resolve failed for ${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('context_resolve_failed');
    }
  }

  private blockedResolve(
    projectId: string,
    stage: ReviewStage | null,
    code: ContextSourceResolveBlockedCode,
  ): ProjectHttpError {
    const body: ContextSourceResolveBlockedDto = {
      status: 'blocked',
      projectId,
      stage,
      code,
      message: OPERATOR_MESSAGES[code],
    };
    return new ProjectHttpError(
      HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      body.message,
      body,
    );
  }

  private async assertRepositoryHardPath(
    repositoryPath: string,
    projectId: string,
    stage: ReviewStage,
  ): Promise<void> {
    let st;
    try {
      st = await stat(repositoryPath);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === 'ENOENT'
      ) {
        throw this.blockedResolve(projectId, stage, 'repository_not_found');
      }
      throw this.blockedResolve(projectId, stage, 'repository_not_readable');
    }
    if (!st.isDirectory()) {
      throw this.blockedResolve(projectId, stage, 'repository_not_directory');
    }
    try {
      await access(repositoryPath, constants.R_OK);
    } catch {
      throw this.blockedResolve(projectId, stage, 'repository_not_readable');
    }
  }
}
