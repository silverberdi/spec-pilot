/**
 * Testcontainers PostgreSQL integration for project registration + configuration.
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
import { validProjectYaml } from './valid-project-yaml.fixture';

const apiRoot = join(__dirname, '../../..');

async function makeEligibleRepo(
  name: string,
  yamlContent: string = validProjectYaml({ projectId: name }),
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'sp-api-'));
  const repo = join(root, name);
  await mkdir(join(repo, '.specpilot'), { recursive: true });
  const yamlPath = join(repo, '.specpilot', 'project.yaml');
  await writeFile(yamlPath, yamlContent);
  return repo;
}

describe('Project registration and configuration (Testcontainers)', () => {
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

  it('registers with attached configuration for valid YAML (201)', async () => {
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
    expect(body.configuration.status).toBe('attached');
    expect(body.configurationVersionId).toBe(body.configuration.version.id);
    expect(body.configuration.version.sourceHash).toMatch(/^[a-f0-9]{64}$/);

    const yamlAfter = await readFile(
      join(repo, '.specpilot', 'project.yaml'),
      'utf8',
    );
    expect(yamlAfter).toBe(yamlBefore);

    const getConfig = await app.inject({
      method: 'GET',
      url: `/projects/${body.id}/configuration`,
    });
    expect(getConfig.statusCode).toBe(200);
    expect(JSON.parse(getConfig.body).id).toBe(body.configuration.version.id);
  });

  it('registers with blocked configuration for invalid YAML (201)', async () => {
    const repo = await makeEligibleRepo('invalid-yaml-repo', 'schemaVersion: 1\n');
    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.configuration.status).toBe('blocked');
    expect(body.configurationVersionId).toBeNull();
    expect(body.configuration.error.code).toBeTruthy();

    const getConfig = await app.inject({
      method: 'GET',
      url: `/projects/${body.id}/configuration`,
    });
    expect(getConfig.statusCode).toBe(404);
    expect(JSON.parse(getConfig.body).code).toBe('configuration_not_found');
  });

  it('blocks oversized YAML on refresh with 422', async () => {
    const repo = await makeEligibleRepo('oversize-base');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    expect(created.statusCode).toBe(201);
    const project = JSON.parse(created.body);

    await writeFile(
      join(repo, '.specpilot', 'project.yaml'),
      'a'.repeat(262145),
    );

    const refresh = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/configuration/refresh`,
    });
    expect(refresh.statusCode).toBe(422);
    expect(JSON.parse(refresh.body).code).toBe('project_yaml_too_large');
  });

  it('refresh same bytes is idempotent', async () => {
    const repo = await makeEligibleRepo('idempotent-repo');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    const project = JSON.parse(created.body);
    expect(project.configuration.status).toBe('attached');
    const firstVersionId = project.configuration.version.id;

    const refresh = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/configuration/refresh`,
    });
    expect(refresh.statusCode).toBe(200);
    expect(JSON.parse(refresh.body).id).toBe(firstVersionId);
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
