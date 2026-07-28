import { access, constants, stat } from 'node:fs/promises';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ProjectDiscoveryDto } from '@specpilot/shared-contracts';
import { isProjectDiscoveryDto } from '@specpilot/shared-contracts';
import { PrismaService } from '../prisma.service';
import { GitInspector } from './git-inspector';
import { OpenSpecInspector } from './openspec-inspector';
import {
  blocked422,
  internal500,
  notFound404,
} from './project-errors';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly gitInspector = new GitInspector();
  private readonly openspecInspector = new OpenSpecInspector();

  constructor(private readonly prisma: PrismaService) {}

  async getDiscovery(projectId: string): Promise<ProjectDiscoveryDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }
    if (project.lastDiscovery == null) {
      throw notFound404('discovery_not_found');
    }
    if (!isProjectDiscoveryDto(project.lastDiscovery)) {
      this.logger.error(
        `Stored lastDiscovery failed type guard for project ${projectId}`,
      );
      throw notFound404('discovery_not_found');
    }
    return project.lastDiscovery;
  }

  async refreshDiscovery(projectId: string): Promise<ProjectDiscoveryDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw notFound404('project_not_found');
    }

    await this.assertRepositoryHardPath(project.repositoryPath);

    try {
      const [git, openspec] = await Promise.all([
        this.gitInspector.inspect(project.repositoryPath),
        this.openspecInspector.inspect(project.repositoryPath),
      ]);

      const inspectedAt = new Date();
      const snapshot: ProjectDiscoveryDto = {
        projectId: project.id,
        inspectedAt: inspectedAt.toISOString(),
        git,
        openspec,
      };

      await this.prisma.project.update({
        where: { id: project.id },
        data: {
          lastInspectedAt: inspectedAt,
          lastDiscovery: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      return snapshot;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Discovery refresh failed for ${projectId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw internal500('discovery_refresh_failed');
    }
  }

  private async assertRepositoryHardPath(repositoryPath: string): Promise<void> {
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
        throw blocked422('repository_not_found');
      }
      throw blocked422('repository_not_readable');
    }

    if (!st.isDirectory()) {
      throw blocked422('repository_not_directory');
    }

    try {
      await access(repositoryPath, constants.R_OK);
    } catch {
      throw blocked422('repository_not_readable');
    }
  }
}
