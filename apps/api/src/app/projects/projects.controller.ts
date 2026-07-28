import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DiscoveryService } from './discovery.service';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly discovery: DiscoveryService,
  ) {}

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

  @Post(':id/configuration/refresh')
  async refreshConfiguration(
    @Param('id') id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const version = await this.projects.refreshConfiguration(id);
    reply.code(200);
    return version;
  }

  @Get(':id/configuration')
  getConfiguration(@Param('id') id: string) {
    return this.projects.getConfiguration(id);
  }

  @Post(':id/discovery/refresh')
  async refreshDiscovery(
    @Param('id') id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const discovery = await this.discovery.refreshDiscovery(id);
    reply.code(200);
    return discovery;
  }

  @Get(':id/discovery')
  getDiscovery(@Param('id') id: string) {
    return this.discovery.getDiscovery(id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.projects.getById(id);
  }
}
