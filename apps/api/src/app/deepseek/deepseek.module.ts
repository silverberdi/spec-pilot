import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { DeepseekHttpAdapter } from './deepseek-http.adapter';
import { DeepseekProbeService } from './deepseek-probe.service';
import { DEEPSEEK_GATEWAY_PORT } from './deepseek.constants';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: DEEPSEEK_GATEWAY_PORT,
      useFactory: () => new DeepseekHttpAdapter(),
    },
    DeepseekProbeService,
  ],
  exports: [DeepseekProbeService, DEEPSEEK_GATEWAY_PORT],
})
export class DeepseekModule {}
