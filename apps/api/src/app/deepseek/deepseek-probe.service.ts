import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
  parseDeepseekProbeRequest,
  type DeepseekProbeOkDto,
  type DeepseekProbeStage,
  type ProjectErrorCode,
} from '@specpilot/shared-contracts';
import { PrismaService } from '../prisma.service';
import {
  blocked422,
  internal500,
  notFound404,
  ProjectHttpError,
} from '../projects/project-errors';
import { modelFromProbeStage } from './deepseek-model-catalog';
import type { DeepseekGatewayPort } from './deepseek-gateway.port';
import {
  DEEPSEEK_API_KEY_ENV,
  DEEPSEEK_GATEWAY_PORT,
  DEEPSEEK_PROVIDER_ID,
} from './deepseek.constants';

@Injectable()
export class DeepseekProbeService {
  private readonly logger = new Logger(DeepseekProbeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DEEPSEEK_GATEWAY_PORT)
    private readonly gateway: DeepseekGatewayPort,
  ) {}

  async probe(projectId: string, body: unknown): Promise<DeepseekProbeOkDto> {
    const parsedReq = parseDeepseekProbeRequest(body);
    if (!parsedReq.ok) {
      throw blocked422('invalid_deepseek_probe_request');
    }
    const stage: DeepseekProbeStage = parsedReq.stage;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { activeConfiguration: true },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }
    if (!project.activeConfiguration) {
      throw notFound404('configuration_not_found');
    }

    const normalized = project.activeConfiguration.normalizedConfig;
    if (
      normalized === null ||
      typeof normalized !== 'object' ||
      Array.isArray(normalized)
    ) {
      throw blocked422('deepseek_model_unresolved');
    }
    const review = (normalized as Record<string, unknown>)['review'];
    if (
      review === null ||
      typeof review !== 'object' ||
      Array.isArray(review)
    ) {
      throw blocked422('deepseek_model_unresolved');
    }

    const resolved = modelFromProbeStage(
      review as Record<string, unknown>,
      stage,
    );
    if (!resolved) {
      throw blocked422('deepseek_model_unresolved');
    }

    const apiKey = process.env[DEEPSEEK_API_KEY_ENV]?.trim() ?? '';
    if (!apiKey) {
      this.logger.log(
        JSON.stringify({
          event: 'deepseek_probe',
          projectId,
          probeStage: stage,
          modelAlias: resolved.alias,
          resolvedModel: resolved.resolvedModelId,
          attemptCount: 0,
          code: 'deepseek_not_configured',
        }),
      );
      throw blocked422('deepseek_not_configured');
    }

    let result;
    try {
      result = await this.gateway.completeStructured({
        resolvedModelId: resolved.resolvedModelId,
        requestedModelAlias: resolved.alias,
        apiKey,
        profile: 'probe',
      });
    } catch {
      throw internal500('deepseek_gateway_failed');
    }

    this.logger.log(
      JSON.stringify({
        event: 'deepseek_probe',
        projectId,
        probeStage: stage,
        modelAlias: resolved.alias,
        resolvedModel: resolved.resolvedModelId,
        attemptCount: result.attemptCount,
        latencyMs: result.latencyMs,
        statusClass: result.status === 'ok' ? '2xx' : 'error',
        code: result.status === 'ok' ? 'ok' : result.code,
      }),
    );

    if (result.status !== 'ok') {
      throw this.mapFailure(result.code);
    }

    const dto: DeepseekProbeOkDto = {
      status: 'ok',
      projectId,
      stage,
      providerId: DEEPSEEK_PROVIDER_ID,
      modelAlias: resolved.alias,
      resolvedModelId: resolved.resolvedModelId,
      schemaId: DEEPSEEK_GATEWAY_PROBE_SCHEMA_ID,
      attemptCount: result.attemptCount,
      providerHttpStatus: 200,
      latencyMs: result.latencyMs,
      parsed: result.parsed as DeepseekProbeOkDto['parsed'],
    };
    if (result.providerRequestId) {
      dto.providerRequestId = result.providerRequestId;
    }
    if (result.usage) {
      dto.usage = result.usage;
    }
    return dto;
  }

  private mapFailure(code: ProjectErrorCode): ProjectHttpError {
    if (code === 'deepseek_gateway_failed') {
      return internal500('deepseek_gateway_failed');
    }
    return blocked422(code);
  }
}
