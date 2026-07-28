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
import { PrismaService } from '../prisma.service';
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
    expect(body.discoveryHealth).toEqual({
      status: 'never_inspected',
      inspectedAt: null,
      gitStatus: 'unknown',
      openspecStatus: 'unknown',
      summaryMessage: null,
    });
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

  it('GET discovery before refresh returns discovery_not_found', async () => {
    const repo = await makeEligibleRepo('discovery-empty');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    expect(created.statusCode).toBe(201);
    const project = JSON.parse(created.body);
    expect(project.lastInspectedAt).toBeNull();

    const getDiscovery = await app.inject({
      method: 'GET',
      url: `/projects/${project.id}/discovery`,
    });
    expect(getDiscovery.statusCode).toBe(404);
    expect(JSON.parse(getDiscovery.body).code).toBe('discovery_not_found');
  });

  it('discovery refresh persists snapshot for git+openspec layout', async () => {
    const repo = await makeEligibleRepo('discovery-ok');
    execFileSync('git', ['init'], { cwd: repo, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], {
      cwd: repo,
      stdio: 'pipe',
    });
    execFileSync('git', ['config', 'user.name', 'Test'], {
      cwd: repo,
      stdio: 'pipe',
    });
    await writeFile(join(repo, 'README.md'), 'hello');
    execFileSync('git', ['add', 'README.md'], { cwd: repo, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: repo, stdio: 'pipe' });
    await mkdir(join(repo, 'openspec', 'changes', 'chg-a', 'specs', 'cap'), {
      recursive: true,
    });
    await writeFile(
      join(repo, 'openspec', 'changes', 'chg-a', 'proposal.md'),
      'p',
    );
    await writeFile(
      join(repo, 'openspec', 'changes', 'chg-a', 'specs', 'cap', 'spec.md'),
      's',
    );

    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    const project = JSON.parse(created.body);

    const refresh = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/discovery/refresh`,
    });
    expect(refresh.statusCode).toBe(200);
    const body = JSON.parse(refresh.body);
    expect(body.projectId).toBe(project.id);
    expect(body.git.status).toBe('ok');
    expect(body.openspec.status).toBe('ok');
    expect(body.openspec.activeChanges[0].hasProposal).toBe(true);
    expect(body.openspec.activeChanges[0].hasSpecs).toBe(true);

    const getProject = await app.inject({
      method: 'GET',
      url: `/projects/${project.id}`,
    });
    expect(JSON.parse(getProject.body).lastInspectedAt).toBe(body.inspectedAt);

    const getDiscovery = await app.inject({
      method: 'GET',
      url: `/projects/${project.id}/discovery`,
    });
    expect(getDiscovery.statusCode).toBe(200);
    expect(JSON.parse(getDiscovery.body).inspectedAt).toBe(body.inspectedAt);
  });

  it('discovery refresh persists blocked git for non-git directory', async () => {
    const repo = await makeEligibleRepo('discovery-nongit');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    const project = JSON.parse(created.body);

    const refresh = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/discovery/refresh`,
    });
    expect(refresh.statusCode).toBe(200);
    const body = JSON.parse(refresh.body);
    expect(body.git.status).toBe('blocked');
    expect(body.git.code).toBe('not_a_git_repository');
    expect(body.openspec.status).toBe('blocked');
    expect(body.openspec.code).toBe('openspec_root_missing');

    const getProject = await app.inject({
      method: 'GET',
      url: `/projects/${project.id}`,
    });
    expect(JSON.parse(getProject.body).lastInspectedAt).toBe(body.inspectedAt);
  });

  it('discovery refresh hard path failure does not update fields', async () => {
    const repo = await makeEligibleRepo('discovery-gone');
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: repo },
    });
    const project = JSON.parse(created.body);

    const { rm } = await import('node:fs/promises');
    await rm(repo, { recursive: true, force: true });

    const refresh = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/discovery/refresh`,
    });
    expect(refresh.statusCode).toBe(422);
    expect(JSON.parse(refresh.body).code).toBe('repository_not_found');

    const getProject = await app.inject({
      method: 'GET',
      url: `/projects/${project.id}`,
    });
    expect(JSON.parse(getProject.body).lastInspectedAt).toBeNull();
  });

  it('GET /projects returns discoveryHealth and registeredAt DESC order', async () => {
    const empty = await app.inject({ method: 'GET', url: '/projects' });
    expect(empty.statusCode).toBe(200);
    // Prior tests may have left projects; still assert ordering among new pair.
    const olderRepo = await makeEligibleRepo('dash-older');
    const newerRepo = await makeEligibleRepo('dash-newer');

    const older = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: olderRepo },
    });
    expect(older.statusCode).toBe(201);
    const olderBody = JSON.parse(older.body);

    await new Promise((r) => setTimeout(r, 20));

    const newer = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { repositoryPath: newerRepo },
    });
    expect(newer.statusCode).toBe(201);
    const newerBody = JSON.parse(newer.body);

    const list = await app.inject({ method: 'GET', url: '/projects' });
    expect(list.statusCode).toBe(200);
    const rows = JSON.parse(list.body) as Array<{
      id: string;
      registeredAt: string;
      discoveryHealth: { status: string };
    }>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.every((r) => r.discoveryHealth?.status)).toBe(true);

    const olderIdx = rows.findIndex((r) => r.id === olderBody.id);
    const newerIdx = rows.findIndex((r) => r.id === newerBody.id);
    expect(olderIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeGreaterThanOrEqual(0);
    expect(newerIdx).toBeLessThan(olderIdx);
    expect(newerBody.discoveryHealth.status).toBe('never_inspected');

    // Blocked discovery should surface on list health.
    const blockedRefresh = await app.inject({
      method: 'POST',
      url: `/projects/${newerBody.id}/discovery/refresh`,
    });
    expect(blockedRefresh.statusCode).toBe(200);

    const listAfter = await app.inject({ method: 'GET', url: '/projects' });
    const afterRows = JSON.parse(listAfter.body) as Array<{
      id: string;
      discoveryHealth: { status: string };
      lastDiscovery?: unknown;
    }>;
    const newerAfter = afterRows.find((r) => r.id === newerBody.id);
    expect(newerAfter?.discoveryHealth.status).toBe('blocked');
    expect(newerAfter).not.toHaveProperty('lastDiscovery');

    // Partial persistence → invalid, list still 200.
    const prisma = app.get(PrismaService);
    await prisma.project.update({
      where: { id: olderBody.id },
      data: { lastInspectedAt: new Date('2026-07-28T15:00:00.000Z') },
    });
    const listInvalid = await app.inject({ method: 'GET', url: '/projects' });
    expect(listInvalid.statusCode).toBe(200);
    const invalidRow = (
      JSON.parse(listInvalid.body) as Array<{
        id: string;
        discoveryHealth: { status: string; summaryMessage: string | null };
      }>
    ).find((r) => r.id === olderBody.id);
    expect(invalidRow?.discoveryHealth.status).toBe('invalid');
    expect(invalidRow?.discoveryHealth.summaryMessage).toBe(
      'No fue posible interpretar el último resultado de descubrimiento.',
    );
  });
});
