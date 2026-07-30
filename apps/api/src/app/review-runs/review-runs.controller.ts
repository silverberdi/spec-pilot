import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ReviewRunsService } from './review-runs.service';

@Controller('projects/:projectId/review-runs')
export class ReviewRunsController {
  constructor(private readonly reviewRuns: ReviewRunsService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.reviewRuns.createAndExecute(projectId, body);
    reply.code(201);
    return result;
  }

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reviewRuns.list(projectId, query);
  }

  @Get(':runId')
  get(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ) {
    return this.reviewRuns.getById(projectId, runId);
  }
}
