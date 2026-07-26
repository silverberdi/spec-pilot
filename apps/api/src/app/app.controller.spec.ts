import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  isHealthResponse,
  isReadyResponse,
} from '@specpilot/shared-contracts';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';

describe('API health and readiness (Fastify inject)', () => {
  let app: NestFastifyApplication;
  let probeDatabase: jest.Mock;

  beforeEach(async () => {
    probeDatabase = jest.fn().mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: { probeDatabase },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns the exact success contract without probing the database', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown;
    expect(body).toEqual({ status: 'ok', service: 'api' });
    expect(isHealthResponse(body)).toBe(true);
    expect(probeDatabase).not.toHaveBeenCalled();
  });

  it('GET /health/ready returns readiness success when the probe succeeds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown;
    expect(body).toEqual({
      status: 'ok',
      service: 'api',
      database: 'ok',
    });
    expect(isReadyResponse(body)).toBe(true);
  });

  it('GET /health/ready returns HTTP 503 with explicit non-ok database status when the probe fails', async () => {
    probeDatabase.mockResolvedValue(false);

    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body) as unknown;
    expect(body).toEqual({
      status: 'error',
      service: 'api',
      database: 'unavailable',
    });
  });

  it('rejects invalid health payloads via shared validator', () => {
    expect(isHealthResponse({ status: 'ok' })).toBe(false);
    expect(isHealthResponse({ status: 'fail', service: 'api' })).toBe(false);
  });
});
