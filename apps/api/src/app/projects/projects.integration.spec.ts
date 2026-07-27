/**
 * Testcontainers PostgreSQL integration for project registration.
 * MUST NOT target axioma-db-dev or SpecPilot Compose volumes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { DISPLAY_NAME_MAX_LENGTH } from '@specpilot/shared-contracts';

const apiRoot = join(__dirname, '../../..');

async function makeEligibleRepo(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'sp-api-'));
  const repo = join(root, name);
  await mkdir(join(repo, '.specpilot'), { recursive: true });
  const yamlPath = join(repo, '.specpilot', 'project.yaml');
  await writeFile(yamlPath, 'schemaVersion: 1\n');
  return repo;
}

describe('Project registration (Testcontainers)', () => {
  jest.setTimeout(180_000);

  let container: StartedPostgreSqlContainer;
  let databaseUrl: string;
  let app: NestFastifyApplication;

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
    if (app) {
      await app.close();
    }
    if (container) {
      await container.stop();
    }
  });

  it('registers an eligible repository with canonical realpath (201)', async () => {
    const repo = await makeEligibleRepo('alpha-repo');
    const expectedCanonical = await realpath(repo);
    const yamlBefore = await readFile(
      join(repo, '.specpilot', 'project.yaml'),
      'utf8',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo + '/' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.slug).toBe('alpha-repo');
    expect(body.repositoryPath).toBe(expectedCanonical);
    expect(body.status).toBe('registered');
    expect(body.lastInspectedAt).toBeNull();

    const yamlAfter = await readFile(
      join(repo, '.specpilot', 'project.yaml'),
      'utf8',
    );
    expect(yamlAfter).toBe(yamlBefore);
  });

  it('blocks missing project.yaml with 422 and creates no row', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sp-api-missing-'));
    const repo = join(root, 'missing-yaml');
    await mkdir(repo);

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({ code: 'project_yaml_missing' }),
    );

    const list = await app.inject({ method: 'GET', url: '/projects' });
    const projects = JSON.parse(list.body) as Array<{ slug: string }>;
    expect(projects.some((p) => p.slug === 'missing-yaml')).toBe(false);
  });

  it('blocks overlong displayName with 422', async () => {
    const repo = await makeEligibleRepo('beta-repo');
    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        repositoryPath: repo,
        displayName: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 1),
      },
    });
    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body).code).toBe('invalid_display_name');
  });

  it('maps duplicate canonical path to 409', async () => {
    const repo = await makeEligibleRepo('gamma-repo');
    const first = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body).code).toBe('duplicate_repository_path');
  });

  it('GET /projects/:id returns 404 project_not_found when missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/projects/00000000-0000-4000-8000-000000000099',
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).code).toBe('project_not_found');
  });
});
