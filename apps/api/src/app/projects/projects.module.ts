import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { FILESYSTEM_PORT } from './filesystem.port';
import { NodeFilesystemAdapter } from './node-filesystem.adapter';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    NodeFilesystemAdapter,
    { provide: FILESYSTEM_PORT, useExisting: NodeFilesystemAdapter },
  ],
})
export class ProjectsModule {}
