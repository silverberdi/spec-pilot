import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DISPLAY_NAME_MAX_LENGTH,
  type ProjectDto,
  type RegisterProjectRequest,
  type RegisterProjectResponse,
  validateRegisterProjectRequest,
} from '@specpilot/shared-contracts';
import { PrismaService } from '../prisma.service';
import { ConfigurationService } from './configuration.service';
import {
  FILESYSTEM_PORT,
  type FilesystemPort,
} from './filesystem.port';
import {
  blocked422,
  conflict409,
  internal500,
  notFound404,
} from './project-errors';
import { deriveSlugFromBasename } from './slug';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILESYSTEM_PORT) private readonly filesystem: FilesystemPort,
    private readonly configuration: ConfigurationService,
  ) {}

  async register(body: unknown): Promise<RegisterProjectResponse> {
    const parsed = validateRegisterProjectRequest(body);
    if (!parsed.ok) {
      throw blocked422(parsed.code);
    }
    const request: RegisterProjectRequest = parsed.request;

    let preflight;
    try {
      preflight = await this.filesystem.preflightRepository(
        request.repositoryPath,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Filesystem preflight failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw internal500();
    }

    if (!preflight.ok) {
      throw blocked422(preflight.code);
    }

    const displayName = this.resolveDisplayName(
      request.displayName,
      preflight.basename,
    );
    if (displayName === null) {
      throw blocked422('invalid_display_name');
    }

    const slug = deriveSlugFromBasename(preflight.basename);
    if (slug === null) {
      throw blocked422('invalid_derived_slug');
    }

    // Precheck improves operator feedback; unique constraints remain final (D10).
    const existingPath = await this.prisma.project.findUnique({
      where: { repositoryPath: preflight.canonicalPath },
    });
    if (existingPath) {
      throw conflict409('duplicate_repository_path');
    }
    const existingSlug = await this.prisma.project.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw conflict409('duplicate_project_slug');
    }

    let created;
    try {
      created = await this.prisma.project.create({
        data: {
          slug,
          displayName,
          repositoryPath: preflight.canonicalPath,
          status: 'registered',
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.['target'];
        const fields = Array.isArray(target)
          ? target.map(String)
          : typeof target === 'string'
            ? [target]
            : [];
        if (
          fields.some(
            (f) =>
              f.includes('repository_path') || f.includes('repositoryPath'),
          )
        ) {
          throw conflict409('duplicate_repository_path');
        }
        if (fields.some((f) => f.includes('slug'))) {
          throw conflict409('duplicate_project_slug');
        }
        throw conflict409('duplicate_repository_path');
      }
      this.logger.error(
        `Project create failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw internal500();
    }

    // Attach after insert; never roll back the Project on attach failure.
    const configuration = await this.configuration.attachAfterRegister(
      created.id,
      created.repositoryPath,
    );

    const project =
      configuration.status === 'attached'
        ? await this.prisma.project.findUniqueOrThrow({ where: { id: created.id } })
        : created;

    return {
      ...this.toDto(project),
      configuration,
    };
  }

  async list(): Promise<ProjectDto[]> {
    const rows = await this.prisma.project.findMany({
      orderBy: { registeredAt: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async getById(id: string): Promise<ProjectDto> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) {
      throw notFound404();
    }
    return this.toDto(row);
  }

  async refreshConfiguration(id: string) {
    const result = await this.configuration.refresh(id);
    if (result.ok) {
      return result.version;
    }
    if (result.kind === 'unexpected') {
      throw internal500('configuration_refresh_failed');
    }
    if (result.code === 'project_not_found') {
      throw notFound404('project_not_found');
    }
    throw blocked422(result.code);
  }

  async getConfiguration(id: string) {
    const result = await this.configuration.getActive(id);
    if (!result.ok) {
      throw notFound404(result.code);
    }
    return result.version;
  }

  private resolveDisplayName(
    raw: string | undefined,
    canonicalBasename: string,
  ): string | null {
    const trimmed = (raw ?? '').trim();
    const value = trimmed.length === 0 ? canonicalBasename : trimmed;
    if (value.length > DISPLAY_NAME_MAX_LENGTH) {
      return null;
    }
    return value;
  }

  private toDto(row: {
    id: string;
    slug: string;
    displayName: string;
    repositoryPath: string;
    status: string;
    registeredAt: Date;
    lastInspectedAt: Date | null;
    configurationVersionId?: string | null;
  }): ProjectDto {
    return {
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      repositoryPath: row.repositoryPath,
      status: 'registered',
      registeredAt: row.registeredAt.toISOString(),
      lastInspectedAt: row.lastInspectedAt
        ? row.lastInspectedAt.toISOString()
        : null,
      configurationVersionId: row.configurationVersionId ?? null,
    };
  }
}
