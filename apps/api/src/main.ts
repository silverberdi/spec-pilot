import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const port = Number(process.env['PORT']) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  Logger.log(`API listening on http://localhost:${port}/health`);
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown bootstrap failure';
  Logger.error(`API failed to start: ${message}`);
  process.exit(1);
});
