import { Controller, Get } from '@nestjs/common';
import {
  createHealthResponse,
  type HealthResponse,
} from '@specpilot/shared-contracts';

@Controller()
export class AppController {
  @Get('health')
  getHealth(): HealthResponse {
    return createHealthResponse();
  }
}
