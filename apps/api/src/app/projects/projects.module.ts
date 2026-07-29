import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ContextBundleService } from './context-bundle.service';
import { ConfigurationService } from './configuration.service';
import { ContextSourceResolutionService } from './context-source-resolution.service';
import { DiscoveryService } from './discovery.service';
import { FILESYSTEM_PORT } from './filesystem.port';
import { NodeFilesystemAdapter } from './node-filesystem.adapter';
import { ProjectYamlReader } from './project-yaml-reader';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SecretDetectionService } from './secret-detection.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ConfigurationService,
    DiscoveryService,
    ContextSourceResolutionService,
    SecretDetectionService,
    ContextBundleService,
    ProjectYamlReader,
    NodeFilesystemAdapter,
    { provide: FILESYSTEM_PORT, useExisting: NodeFilesystemAdapter },
  ],
})
export class ProjectsModule {}
