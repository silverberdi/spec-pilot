import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ReviewRunsModule } from './review-runs/review-runs.module';

@Module({
  imports: [PrismaModule, ProjectsModule, ReviewRunsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
