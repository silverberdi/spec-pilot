/**
 * Testcontainers PostgreSQL integration — ephemeral container only.
 * MUST NOT target axioma-db-dev or SpecPilot Compose volumes.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';

const apiRoot = join(__dirname, '../..');

describe('Prisma persistence (Testcontainers)', () => {
  jest.setTimeout(180_000);

  let container: StartedPostgreSqlContainer;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('specpilot_test')
      .withUsername('specpilot')
      .withPassword('specpilot')
      .start();

    databaseUrl = container.getConnectionUri();
    process.env['DATABASE_URL'] = databaseUrl;

    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });
  });

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  it('applies migrations and completes an app_metadata round trip', async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();
    const key = `probe-${Date.now()}`;
    await prisma.appMetadata.create({
      data: { key, value: 'ok' },
    });
    const read = await prisma.appMetadata.findUnique({ where: { key } });
    expect(read?.value).toBe('ok');
    await prisma.$disconnect();
    await pool.end();
  });

  it('readiness succeeds against the live Testcontainers database and fails when unreachable', async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    const liveModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [PrismaService],
    }).compile();
    const liveApp =
      liveModule.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
    await liveApp.init();
    await liveApp.getHttpAdapter().getInstance().ready();

    const ok = await liveApp.inject({ method: 'GET', url: '/health/ready' });
    expect(ok.statusCode).toBe(200);
    expect(JSON.parse(ok.body)).toEqual({
      status: 'ok',
      service: 'api',
      database: 'ok',
    });
    await liveApp.close();

    process.env['DATABASE_URL'] =
      'postgresql://specpilot:specpilot@127.0.0.1:1/specpilot?schema=public';
    const failModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [PrismaService],
    }).compile();
    const failApp =
      failModule.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
    await failApp.init();
    await failApp.getHttpAdapter().getInstance().ready();

    const bad = await failApp.inject({ method: 'GET', url: '/health/ready' });
    expect(bad.statusCode).toBe(503);
    expect(JSON.parse(bad.body)).toEqual({
      status: 'error',
      service: 'api',
      database: 'unavailable',
    });
    await failApp.close();
  });
});
