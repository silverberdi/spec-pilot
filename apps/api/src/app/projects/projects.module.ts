import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ConfigurationService } from './configuration.service';
import { DiscoveryService } from './discovery.service';
import { FILESYSTEM_PORT } from './filesystem.port';
import { NodeFilesystemAdapter } from './node-filesystem.adapter';
import { ProjectYamlReader } from './project-yaml-reader';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ConfigurationService,
    DiscoveryService,
    ProjectYamlReader,
    NodeFilesystemAdapter,
    { provide: FILESYSTEM_PORT, useExisting: NodeFilesystemAdapter },
  ],
})
export class ProjectsModule {}
