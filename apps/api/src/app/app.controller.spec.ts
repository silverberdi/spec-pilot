import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { isHealthResponse } from '@specpilot/shared-contracts';
import { AppModule } from './app.module';

describe('API health (Fastify inject)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns the exact success contract', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown;
    expect(body).toEqual({ status: 'ok', service: 'api' });
    expect(isHealthResponse(body)).toBe(true);
  });

  it('rejects invalid health payloads via shared validator', () => {
    expect(isHealthResponse({ status: 'ok' })).toBe(false);
    expect(isHealthResponse({ status: 'fail', service: 'api' })).toBe(false);
  });
});
