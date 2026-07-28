import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parse as parseYaml } from 'yaml';
import type {
  ProjectConfigurationVersionDto,
  ProjectErrorResponse,
} from '@specpilot/shared-contracts';
import { PrismaService } from '../prisma.service';
import { ProjectYamlReader } from './project-yaml-reader';
import {
  validateProjectYamlBytes,
  type ConfigurationFailureCode,
} from './project-yaml-validator';
import { OPERATOR_MESSAGES } from './project-errors';

export type AttachSuccess = {
  status: 'attached';
  version: ProjectConfigurationVersionDto;
};

export type AttachBlocked = {
  status: 'blocked';
  error: ProjectErrorResponse;
};

export type AttachOutcome = AttachSuccess | AttachBlocked;

export type RefreshResult =
  | { ok: true; version: ProjectConfigurationVersionDto }
  | { ok: false; kind: 'expected'; code: ConfigurationFailureCode | 'project_not_found' }
  | { ok: false; kind: 'unexpected' };

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly yamlReader: ProjectYamlReader,
  ) {}

  /**
   * Post-register attach: never throws for expected/unexpected attach failures.
   * Callers keep the Project and map blocked outcomes onto RegisterProjectResponse.
   */
  async attachAfterRegister(projectId: string, repositoryPath: string): Promise<AttachOutcome> {
    try {
      const result = await this.persistFromDisk(projectId, repositoryPath);
      if (!result.ok) {
        return {
          status: 'blocked',
          error: {
            code: result.code,
            message: OPERATOR_MESSAGES[result.code],
          },
        };
      }
      return { status: 'attached', version: result.version };
    } catch (error: unknown) {
      this.logger.error(
        `configuration_attach_failed projectId=${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return {
        status: 'blocked',
        error: {
          code: 'configuration_attach_failed',
          message: OPERATOR_MESSAGES.configuration_attach_failed,
        },
      };
    }
  }

  async refresh(projectId: string): Promise<RefreshResult> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return { ok: false, kind: 'expected', code: 'project_not_found' };
    }

    try {
      const result = await this.persistFromDisk(projectId, project.repositoryPath);
      if (!result.ok) {
        return { ok: false, kind: 'expected', code: result.code };
      }
      return { ok: true, version: result.version };
    } catch (error: unknown) {
      this.logger.error(
        `configuration_refresh_failed projectId=${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return { ok: false, kind: 'unexpected' };
    }
  }

  async getActive(projectId: string): Promise<
    | { ok: true; version: ProjectConfigurationVersionDto }
    | { ok: false; code: 'project_not_found' | 'configuration_not_found' }
  > {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return { ok: false, code: 'project_not_found' };
    }
    if (!project.configurationVersionId) {
      return { ok: false, code: 'configuration_not_found' };
    }
    const version = await this.prisma.projectConfigurationVersion.findUnique({
      where: { id: project.configurationVersionId },
    });
    if (!version) {
      return { ok: false, code: 'configuration_not_found' };
    }
    return { ok: true, version: this.toDto(version) };
  }

  private async persistFromDisk(
    projectId: string,
    repositoryPath: string,
  ): Promise<
    | { ok: true; version: ProjectConfigurationVersionDto }
    | { ok: false; code: ConfigurationFailureCode }
  > {
    const read = await this.yamlReader.readExactBytes(repositoryPath);
    if (!read.ok) {
      return read;
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(read.bytes.toString('utf8'));
    } catch {
      return { ok: false, code: 'project_yaml_parse_error' };
    }

    const validated = validateProjectYamlBytes(read.bytes, parsed);
    if (!validated.ok) {
      return validated;
    }

    const { schemaVersion, sourceHash, normalizedConfig } = validated.value;

    const existing = await this.prisma.projectConfigurationVersion.findUnique({
      where: {
        projectId_sourceHash: { projectId, sourceHash },
      },
    });
    if (existing) {
      if (existing.projectId === projectId) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { configurationVersionId: existing.id },
        });
        return { ok: true, version: this.toDto(existing) };
      }
    }

    try {
      const version = await this.prisma.$transaction(async (tx) => {
        const created = await tx.projectConfigurationVersion.create({
          data: {
            projectId,
            schemaVersion,
            sourceHash,
            normalizedConfig: normalizedConfig as Prisma.InputJsonValue,
            validatedAt: new Date(),
          },
        });
        await tx.project.update({
          where: { id: projectId },
          data: { configurationVersionId: created.id },
        });
        return created;
      });
      return { ok: true, version: this.toDto(version) };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.projectConfigurationVersion.findUnique({
          where: {
            projectId_sourceHash: { projectId, sourceHash },
          },
        });
        if (raced) {
          await this.prisma.project.update({
            where: { id: projectId },
            data: { configurationVersionId: raced.id },
          });
          return { ok: true, version: this.toDto(raced) };
        }
      }
      throw error;
    }
  }

  private toDto(row: {
    id: string;
    projectId: string;
    schemaVersion: number;
    sourceHash: string;
    normalizedConfig: Prisma.JsonValue;
    validatedAt: Date;
    createdAt: Date;
  }): ProjectConfigurationVersionDto {
    return {
      id: row.id,
      projectId: row.projectId,
      schemaVersion: row.schemaVersion,
      sourceHash: row.sourceHash,
      normalizedConfig:
        typeof row.normalizedConfig === 'object' &&
        row.normalizedConfig !== null &&
        !Array.isArray(row.normalizedConfig)
          ? (row.normalizedConfig as Record<string, unknown>)
          : {},
      validatedAt: row.validatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
