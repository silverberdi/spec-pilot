import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const project = await this.projects.register(body);
    reply.code(201);
    return project;
  }

  @Get()
  list() {
    return this.projects.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.projects.getById(id);
  }
}
