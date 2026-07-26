import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  createHealthResponse,
  createReadyResponse,
  createUnreadyResponse,
  type HealthResponse,
  type ReadyResponse,
} from '@specpilot/shared-contracts';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return createHealthResponse();
  }

  @Get('health/ready')
  async getReady(): Promise<ReadyResponse> {
    const ok = await this.prisma.probeDatabase();
    if (!ok) {
      throw new HttpException(
        createUnreadyResponse(),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return createReadyResponse();
  }
}
