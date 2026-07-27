import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
