import { Module } from '@nestjs/common';
import { DeepseekModule } from '../deepseek/deepseek.module';
import { PrismaModule } from '../prisma.module';
import { ReviewRunsController } from './review-runs.controller';
import { ReviewRunsService } from './review-runs.service';

@Module({
  imports: [PrismaModule, DeepseekModule],
  controllers: [ReviewRunsController],
  providers: [ReviewRunsService],
  exports: [ReviewRunsService],
})
export class ReviewRunsModule {}
