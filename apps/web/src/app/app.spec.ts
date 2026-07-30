import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { App } from './app';
import { environment } from '../environments/environment.local';

const neverInspectedHealth = {
  status: 'never_inspected' as const,
  inspectedAt: null,
  gitStatus: 'unknown' as const,
  openspecStatus: 'unknown' as const,
  summaryMessage: null,
};


const version = {
  id: '22222222-2222-2222-2222-222222222222',
  projectId: '11111111-1111-1111-1111-111111111111',
  schemaVersion: 1,
  sourceHash: 'a'.repeat(64),
  normalizedConfig: { schemaVersion: 1, project: { id: 'demo-repo' } },
  validatedAt: '2026-07-27T00:00:00.000Z',
  createdAt: '2026-07-27T00:00:00.000Z',
};

describe('App shell and registration', () => {
  let fixture: ComponentFixture<App>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        providePrimeNG({
          theme: {
            preset: Aura,
          },
        }),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    httpMock.verify();
  });

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  function flushProjectsList(body: unknown[] = []): void {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    expect(req.request.method).toBe('GET');
    req.flush(body);
  }

  it('renders SpecPilot success shell with empty registry', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('SpecPilot');
    expect(el.querySelector('[data-state="success"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="dashboard-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="empty-registry"]')).toBeTruthy();
  });

  it('shows dashboard loading then populated health rows in API order', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-loading"]'),
    ).toBeTruthy();

    flushProjectsList([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        slug: 'newer',
        displayName: 'newer',
        repositoryPath: '/tmp/newer',
        status: 'registered',
        registeredAt: '2026-07-28T02:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        slug: 'older-blocked',
        displayName: 'older-blocked',
        repositoryPath: '/tmp/older',
        status: 'registered',
        registeredAt: '2026-07-28T01:00:00.000Z',
        lastInspectedAt: '2026-07-28T01:30:00.000Z',
        configurationVersionId: version.id,
        discoveryHealth: {
          status: 'blocked',
          inspectedAt: '2026-07-28T01:30:00.000Z',
          gitStatus: 'blocked',
          openspecStatus: 'ok',
          summaryMessage: 'No es un repositorio Git.',
        },
      },
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="dashboard-row"]',
    );
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('data-project-id')).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
    expect(rows[0].getAttribute('data-health')).toBe('never_inspected');
    expect(rows[1].getAttribute('data-health')).toBe('blocked');
    expect(fixture.nativeElement.textContent).toContain('Sin inspeccionar');
    expect(fixture.nativeElement.textContent).toContain('Con incidencias');
    expect(fixture.nativeElement.textContent).toContain(
      'No es un repositorio Git.',
    );
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-loading"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-empty"]'),
    ).toBeNull();
    // Selector shares the same projects() collection.
    const options = fixture.nativeElement.querySelectorAll(
      '[data-testid="project-select"] option',
    );
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('newer');
    expect(options[1].textContent).toContain('older-blocked');
    expect(rows[0].querySelector('[data-testid="dashboard-identity"]')?.textContent).toContain(
      'newer',
    );
    expect(rows[0].querySelector('[data-testid="dashboard-config"]')?.textContent).toContain(
      'Sin configuración activa',
    );
  });

  it('rejects stale list payload missing discoveryHealth without rendering a bullet row', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'spec-pilot',
        displayName: 'spec-pilot',
        repositoryPath: '/tmp/spec-pilot',
        status: 'registered',
        registeredAt: '2026-07-28T00:00:00.000Z',
        lastInspectedAt: '2026-07-28T19:39:24.485Z',
        configurationVersionId: version.id,
        // intentionally omit discoveryHealth (stale API contract)
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-error"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-row"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-list"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-loading"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-empty"]'),
    ).toBeNull();
  });

  it('shows dashboard error when list request fails', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    req.flush(
      { code: 'internal_error', message: 'boom' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="dashboard-error"]'),
    ).toBeTruthy();
  });

  it('surfaces an explicit error state for invalid bootstrap', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'invalid');
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-state="error"]')).toBeTruthy();
    expect(el.textContent).toContain('No se pudo iniciar la consola');
  });

  it('shows loading then success with attached configuration after register 201', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.repositoryPath.set('/tmp/demo-repo');
    component.submitRegistration();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="registration-loading"]'),
    ).toBeTruthy();

    const post = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    expect(post.request.method).toBe('POST');
    post.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'demo-repo',
      displayName: 'demo-repo',
      repositoryPath: '/tmp/demo-repo',
      status: 'registered',
      registeredAt: '2026-07-27T00:00:00.000Z',
      lastInspectedAt: null,
      configurationVersionId: version.id,
      discoveryHealth: neverInspectedHealth,
      configuration: { status: 'attached', version },
    });
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: version.id,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="registration-success"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="configuration-attached"]'),
    ).toBeTruthy();
  });

  it('shows configuration blocked when register 201 has blocked attach', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([]);
    fixture.detectChanges();

    fixture.componentInstance.repositoryPath.set('/tmp/demo-repo');
    fixture.componentInstance.submitRegistration();
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    post.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'demo-repo',
      displayName: 'demo-repo',
      repositoryPath: '/tmp/demo-repo',
      status: 'registered',
      registeredAt: '2026-07-27T00:00:00.000Z',
      lastInspectedAt: null,
      configurationVersionId: null,
      discoveryHealth: neverInspectedHealth,
      configuration: {
        status: 'blocked',
        error: {
          code: 'project_yaml_parse_error',
          message: 'YAML inválido',
        },
      },
    });
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="configuration-blocked"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('YAML inválido');
  });

  it('shows blocked state for 422 responses', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([]);
    fixture.detectChanges();

    fixture.componentInstance.repositoryPath.set('/tmp/bad');
    fixture.componentInstance.submitRegistration();
    fixture.detectChanges();

    const post = httpMock.expectOne(`${environment.apiBaseUrl}/projects`);
    expect(post.request.method).toBe('POST');
    post.flush(
      { code: 'project_yaml_missing', message: 'Falta project.yaml' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="registration-blocked"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Falta project.yaml');
  });

  it('refreshes configuration for a selected project', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();

    fixture.componentInstance.refreshConfiguration();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="configuration-loading"]'),
    ).toBeTruthy();

    const refresh = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/configuration/refresh`,
    );
    expect(refresh.request.method).toBe('POST');
    refresh.flush(version);
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: version.id,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="configuration-refresh-success"]',
      ),
    ).toBeTruthy();
  });

  it('shows empty discovery then success after refresh', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="discovery-empty"]'),
    ).toBeTruthy();

    fixture.componentInstance.refreshDiscovery();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="discovery-loading"]'),
    ).toBeTruthy();

    const refresh = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/discovery/refresh`,
    );
    expect(refresh.request.method).toBe('POST');
    refresh.flush({
      projectId: '11111111-1111-1111-1111-111111111111',
      inspectedAt: '2026-07-28T12:00:00.000Z',
      git: {
        status: 'ok',
        isRepo: true,
        headSha: 'a'.repeat(40),
        branch: 'main',
        dirty: false,
        upstream: null,
      },
      openspec: {
        status: 'ok',
        rootPresent: true,
        activeChanges: [],
        archivedChangeCount: 0,
        cliAvailable: false,
      },
    });
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: '2026-07-28T12:00:00.000Z',
        configurationVersionId: null,
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="discovery-refresh-success"]',
      ),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('solo lectura');
  });

  it('resolves context sources with idle loading success empty blocked and path cap', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="context-resolve-idle"]'),
    ).toBeTruthy();

    fixture.componentInstance.resolveContextSources();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-resolve-loading"]',
      ),
    ).toBeTruthy();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/resolve`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stage: 'planning' });
    const paths = Array.from({ length: 201 }, (_, i) => `docs/f${i}.md`);
    req.flush({
      status: 'ok',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      resolvedAt: '2026-07-28T00:00:00.000Z',
      include: ['docs/**'],
      exclude: ['**/.env'],
      pathCount: 201,
      paths,
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-resolve-success"]',
      ),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="context-resolve-cap"]')
        ?.textContent,
    ).toContain('Mostrando 200 de 201');
    const listItems = fixture.nativeElement.querySelectorAll(
      '[data-testid="context-resolve-paths"] li',
    );
    expect(listItems.length).toBe(200);

    fixture.componentInstance.resolveContextSources();
    fixture.detectChanges();
    const emptyReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/resolve`,
    );
    emptyReq.flush({
      status: 'ok',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      resolvedAt: '2026-07-28T00:00:00.000Z',
      include: ['docs/**'],
      exclude: ['**/.env'],
      pathCount: 0,
      paths: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin rutas candidatas');

    fixture.componentInstance.resolveContextSources();
    fixture.detectChanges();
    const blockedReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/resolve`,
    );
    blockedReq.flush(
      {
        status: 'blocked',
        projectId: '11111111-1111-1111-1111-111111111111',
        stage: 'planning',
        code: 'configuration_not_found',
        message: 'Sin configuración activa',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-resolve-blocked"]',
      ),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Sin configuración activa',
    );
  });

  it('secret-scans with idle loading success exclusions unsafe and blocked', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="secret-scan-idle"]'),
    ).toBeTruthy();

    fixture.componentInstance.runSecretScan();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="secret-scan-loading"]'),
    ).toBeTruthy();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/secret-scan`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stage: 'planning' });
    req.flush({
      status: 'ok',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      scannedAt: '2026-07-28T00:00:00.000Z',
      candidatePathCount: 2,
      eligiblePathCount: 1,
      eligiblePaths: ['clean.md'],
      findings: [{ path: 'dirty.md', detectorId: 'github_pat' }],
      unscannable: [],
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="secret-scan-success"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Análisis con exclusiones');
    expect(fixture.nativeElement.textContent).toContain('dirty.md · github_pat');

    fixture.componentInstance.runSecretScan();
    fixture.detectChanges();
    const emptyReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/secret-scan`,
    );
    emptyReq.flush({
      status: 'ok',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      scannedAt: '2026-07-28T00:00:00.000Z',
      candidatePathCount: 0,
      eligiblePathCount: 0,
      eligiblePaths: [],
      findings: [],
      unscannable: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Sin candidatos que analizar',
    );

    fixture.componentInstance.runSecretScan();
    fixture.detectChanges();
    const unsafeReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-sources/secret-scan`,
    );
    unsafeReq.flush(
      {
        status: 'blocked',
        projectId: '11111111-1111-1111-1111-111111111111',
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'Conjunto no seguro',
        candidatePathCount: 1,
        findingCount: 1,
        unscannableCount: 0,
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="secret-scan-unsafe-counts"]',
      )?.textContent,
    ).toContain('candidatos=1');
    expect(fixture.nativeElement.textContent).toContain(
      'Conjunto de contexto no seguro',
    );
  });

  it('creates context bundles with idle loading success empty and unsafe blocked', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="context-bundle-idle"]'),
    ).toBeTruthy();

    fixture.componentInstance.createContextBundle();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-bundle-loading"]',
      ),
    ).toBeTruthy();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stage: 'planning' });
    req.flush({
      status: 'ok',
      id: '33333333-3333-3333-3333-333333333333',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      createdAt: '2026-07-29T00:00:00.000Z',
      manifestSchemaVersion: 1,
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestHash: 'b'.repeat(64),
      entryCount: 1,
      totalTokenEstimate: 2,
      candidatePathCount: 1,
      eligiblePathCount: 1,
      excludedPathCount: 0,
      findingCount: 0,
      unscannableCount: 0,
      entries: [
        {
          path: 'clean.md',
          contentHash: 'c'.repeat(64),
          lineRanges: [{ startLine: 1, endLine: 1 }],
          tokenEstimate: 2,
        },
      ],
      exclusions: [],
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-bundle-success"]',
      ),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Manifiesto de contexto creado',
    );
    expect(fixture.nativeElement.textContent).toContain('full-file-lines-v1');
    expect(fixture.nativeElement.textContent).not.toContain(
      'contentTransmitted',
    );

    fixture.componentInstance.createContextBundle();
    fixture.detectChanges();
    const emptyReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles`,
    );
    emptyReq.flush({
      status: 'ok',
      id: '44444444-4444-4444-4444-444444444444',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      createdAt: '2026-07-29T00:00:00.000Z',
      manifestSchemaVersion: 1,
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestHash: 'd'.repeat(64),
      entryCount: 0,
      totalTokenEstimate: 0,
      candidatePathCount: 0,
      eligiblePathCount: 0,
      excludedPathCount: 0,
      findingCount: 0,
      unscannableCount: 0,
      entries: [],
      exclusions: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Manifiesto vacío');

    fixture.componentInstance.createContextBundle();
    fixture.detectChanges();
    const unsafeReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles`,
    );
    unsafeReq.flush(
      {
        status: 'blocked',
        projectId: '11111111-1111-1111-1111-111111111111',
        stage: 'planning',
        code: 'unsafe_context_bundle',
        message: 'Conjunto inseguro',
        candidatePathCount: 1,
        findingCount: 0,
        unscannableCount: 1,
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="context-bundle-unsafe-counts"]',
      )?.textContent,
    ).toContain('candidatos=1');
    expect(fixture.nativeElement.textContent).toContain(
      'Conjunto de contexto no seguro',
    );
  });

  it('previews and approves disclosure with idle loading success empty and blocked states, a 20-item cap, and both policy ids visible', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();

    // No context bundle selected yet: preview/status are disabled and hinted.
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-need-bundle"]'),
    ).toBeTruthy();

    fixture.componentInstance.createContextBundle();
    fixture.detectChanges();
    const bundleReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles`,
    );
    bundleReq.flush({
      status: 'ok',
      id: '33333333-3333-3333-3333-333333333333',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      createdAt: '2026-07-29T00:00:00.000Z',
      manifestSchemaVersion: 1,
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestHash: 'b'.repeat(64),
      entryCount: 1,
      totalTokenEstimate: 2,
      candidatePathCount: 1,
      eligiblePathCount: 1,
      excludedPathCount: 0,
      findingCount: 0,
      unscannableCount: 0,
      entries: [
        {
          path: 'clean.md',
          contentHash: 'c'.repeat(64),
          lineRanges: [{ startLine: 1, endLine: 1 }],
          tokenEstimate: 2,
        },
      ],
      exclusions: [],
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-need-bundle"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-idle"]'),
    ).toBeTruthy();

    fixture.componentInstance.previewDisclosure();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-loading"]'),
    ).toBeTruthy();

    const previewItems = Array.from({ length: 21 }, (_, i) => ({
      path: `file-${i}.md`,
      contentHash: 'c'.repeat(64),
      lineRanges: [{ startLine: 1, endLine: 3 }],
      tokenEstimate: 4,
      excerpt: `contenido de ejemplo ${i}`,
    }));
    const previewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/preview`,
    );
    expect(previewReq.request.method).toBe('POST');
    previewReq.flush({
      status: 'ok',
      previewSessionId: '44444444-4444-4444-4444-444444444444',
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      previewIntegrityHash: 'd'.repeat(64),
      createdAt: '2026-07-29T00:00:00.000Z',
      expiresAt: '2026-07-29T00:15:00.000Z',
      bundleId: '33333333-3333-3333-3333-333333333333',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      manifestHash: 'b'.repeat(64),
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestSchemaVersion: 1,
      itemCount: 21,
      previewedCodePointCount: 100,
      totalTokenEstimate: 84,
      approvalRequired: true,
      items: previewItems,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-success"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Vista previa de divulgación generada',
    );
    expect(fixture.nativeElement.textContent).toContain('bounded-selected-text-v1');
    expect(fixture.nativeElement.textContent).toContain(
      'explicit-disclosure-approval-v1',
    );
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-cap"]')
        ?.textContent,
    ).toContain('Mostrando 20 de 21 entradas');
    const previewListItems = fixture.nativeElement.querySelectorAll(
      '[data-testid="disclosure-preview-items"] li',
    );
    expect(previewListItems.length).toBe(20);
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-items"]')
        ?.textContent,
    ).toContain('contenido de ejemplo 0');

    // Preview exists but not yet approved: approval idle hint is shown.
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-approval-idle"]'),
    ).toBeTruthy();

    fixture.componentInstance.approveDisclosure();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-approval-loading"]'),
    ).toBeTruthy();

    const approveReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/disclosure-approvals`,
    );
    expect(approveReq.request.method).toBe('POST');
    expect(approveReq.request.body).toEqual({
      previewSessionId: '44444444-4444-4444-4444-444444444444',
      manifestHash: 'b'.repeat(64),
      decision: 'approved',
    });
    approveReq.flush({
      status: 'ok',
      id: '55555555-5555-5555-5555-555555555555',
      projectId: '11111111-1111-1111-1111-111111111111',
      contextBundleId: '33333333-3333-3333-3333-333333333333',
      previewSessionId: '44444444-4444-4444-4444-444444444444',
      stage: 'planning',
      configurationVersionId: '22222222-2222-2222-2222-222222222222',
      sourceHash: 'a'.repeat(64),
      manifestSchemaVersion: 1,
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestHash: 'b'.repeat(64),
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      previewIntegrityHash: 'd'.repeat(64),
      decision: 'approved',
      contentTransmitted: false,
      createdAt: '2026-07-29T00:05:00.000Z',
      approvalRequired: false,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-approval-success"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Divulgación aprobada');
    const approvalSuccessText = fixture.nativeElement.querySelector(
      '[data-testid="disclosure-approval-success"]',
    )?.textContent;
    expect(approvalSuccessText).toContain('bounded-selected-text-v1');
    expect(approvalSuccessText).toContain('explicit-disclosure-approval-v1');
    expect(approvalSuccessText).toContain('contentTransmitted=no');
    expect(approvalSuccessText).toContain('aprobaciónRequerida=no');

    // Re-run preview with an explicit empty result.
    fixture.componentInstance.previewDisclosure();
    fixture.detectChanges();
    const emptyPreviewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/preview`,
    );
    emptyPreviewReq.flush({
      status: 'ok',
      previewSessionId: '66666666-6666-6666-6666-666666666666',
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      previewIntegrityHash: 'e'.repeat(64),
      createdAt: '2026-07-29T00:10:00.000Z',
      expiresAt: '2026-07-29T00:25:00.000Z',
      bundleId: '33333333-3333-3333-3333-333333333333',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      manifestHash: 'b'.repeat(64),
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestSchemaVersion: 1,
      itemCount: 0,
      previewedCodePointCount: 0,
      totalTokenEstimate: 0,
      approvalRequired: false,
      items: [],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Vista previa sin entradas');
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-cap"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="disclosure-preview-items"] li',
      ).length,
    ).toBe(0);

    // Blocked preview.
    fixture.componentInstance.previewDisclosure();
    fixture.detectChanges();
    const blockedPreviewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/preview`,
    );
    blockedPreviewReq.flush(
      {
        code: 'disclosure_preview_integrity_mismatch',
        message: 'El contenido cambió desde la última verificación.',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-preview-blocked"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'El contenido cambió desde la última verificación.',
    );

    // Blocked approval (e.g. expired preview session) requires a preview to be set first.
    fixture.componentInstance.previewDisclosure();
    fixture.detectChanges();
    const rePreviewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/preview`,
    );
    rePreviewReq.flush({
      status: 'ok',
      previewSessionId: '77777777-7777-7777-7777-777777777777',
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      previewIntegrityHash: 'f'.repeat(64),
      createdAt: '2026-07-29T00:20:00.000Z',
      expiresAt: '2026-07-29T00:35:00.000Z',
      bundleId: '33333333-3333-3333-3333-333333333333',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'planning',
      manifestHash: 'b'.repeat(64),
      selectionPolicyId: 'full-file-lines-v1',
      tokenEstimatorId: 'unicode-codepoints-div-4-v1',
      manifestSchemaVersion: 1,
      itemCount: 1,
      previewedCodePointCount: 10,
      totalTokenEstimate: 4,
      approvalRequired: true,
      items: [
        {
          path: 'clean.md',
          contentHash: 'c'.repeat(64),
          lineRanges: [{ startLine: 1, endLine: 1 }],
          tokenEstimate: 4,
          excerpt: 'contenido limpio',
        },
      ],
    });
    fixture.detectChanges();

    fixture.componentInstance.approveDisclosure();
    fixture.detectChanges();
    const blockedApproveReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/context-bundles/33333333-3333-3333-3333-333333333333/disclosure-approvals`,
    );
    blockedApproveReq.flush(
      {
        code: 'disclosure_preview_expired',
        message: 'La vista previa expiró.',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="disclosure-approval-blocked"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('La vista previa expiró.');
    // Copy states approval never transmits to DeepSeek and preview TTL is 15 minutes.
    expect(fixture.nativeElement.textContent).toContain('DeepSeek');
    expect(fixture.nativeElement.textContent).toContain('15 minutos');
  });

  it('probes DeepSeek with idle loading success and blocked states', async () => {
    fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-idle"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'No inicia una ejecución de revisión ni reserva presupuesto',
    );

    const stageSelect = fixture.nativeElement.querySelector(
      '[data-testid="deepseek-probe-stage-select"]',
    ) as HTMLSelectElement;
    expect(fixture.componentInstance.deepseekProbeStage()).toBe('discovery');
    const stageOptions = Array.from(stageSelect.options).map((o) => o.value);
    expect(stageOptions).toEqual(['discovery', 'planning', 'applied', 'verify']);

    fixture.componentInstance.probeDeepseek();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-loading"]'),
    ).toBeTruthy();

    const probeReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/deepseek/probe`,
    );
    expect(probeReq.request.method).toBe('POST');
    expect(probeReq.request.body).toEqual({ stage: 'discovery' });
    probeReq.flush({
      status: 'ok',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'discovery',
      providerId: 'deepseek',
      modelAlias: 'deepseek-flash',
      resolvedModelId: 'deepseek-v4-flash',
      schemaId: 'deepseek-gateway-probe-v1',
      attemptCount: 1,
      providerHttpStatus: 200,
      latencyMs: 42,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      parsed: {
        ok: true,
        probe: 'deepseek-gateway-probe-v1',
        message: 'probe-ok',
      },
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-success"]'),
    ).toBeTruthy();
    const successText = fixture.nativeElement.querySelector(
      '[data-testid="deepseek-probe-success"]',
    )?.textContent;
    expect(successText).toContain('deepseek-v4-flash');
    expect(successText).toContain('deepseek-gateway-probe-v1');
    expect(successText).toContain('intentos=1');
    expect(successText).toContain('latenciaMs=42');
    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-usage"]')
        ?.textContent,
    ).toContain('total=15');
    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-message"]')
        ?.textContent,
    ).toContain('probe-ok');

    fixture.componentInstance.probeDeepseek();
    fixture.detectChanges();
    const blockedReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/deepseek/probe`,
    );
    blockedReq.flush(
      {
        code: 'deepseek_not_configured',
        message: 'DeepSeek no está configurado.',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="deepseek-probe-blocked"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'DeepSeek no está configurado.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Prueba DeepSeek bloqueada',
    );
  });

  it('shows review-run idle, loading, success, and blocked outcomes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentRef.setInput('bootstrapMode', 'ok');
    fixture.detectChanges();
    await flushMicrotasks();
    flushProjectsList([
      {
        id: '11111111-1111-1111-1111-111111111111',
        slug: 'demo-repo',
        displayName: 'demo-repo',
        repositoryPath: '/tmp/demo-repo',
        status: 'registered',
        registeredAt: '2026-07-27T00:00:00.000Z',
        lastInspectedAt: null,
        configurationVersionId: '22222222-2222-2222-2222-222222222222',
        discoveryHealth: neverInspectedHealth,
      },
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="review-run-idle"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Iniciar revisión');
    expect(fixture.nativeElement.textContent).toContain('not_enforced');

    fixture.componentInstance.reviewRunContextBundleId.set('bundle-1');
    fixture.componentInstance.startReviewRun();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="review-run-loading"]'),
    ).toBeTruthy();

    const createReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/review-runs`,
    );
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({
      stage: 'new',
      contextBundleId: 'bundle-1',
    });
    createReq.flush({
      status: 'ok',
      id: 'run-1',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'new',
      changeId: null,
      state: 'completed',
      contextBundleId: 'bundle-1',
      manifestHash: 'm'.repeat(64),
      disclosureApprovalId: 'a1',
      previewSessionId: 's1',
      previewIntegrityHash: 'h'.repeat(64),
      previewPolicyId: 'bounded-selected-text-v1',
      approvalPolicyId: 'explicit-disclosure-approval-v1',
      budgetCheckStatus: 'not_enforced',
      promptTemplateId: 'review-run-orchestration-v1',
      modelAlias: 'deepseek-flash',
      resolvedModelId: 'deepseek-v4-flash',
      schemaId: 'review-run-orchestration-v1',
      verdict: 'ready_to_create',
      rationale: 'listo',
      attemptCount: 1,
      latencyMs: 12,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      blockedCode: null,
      failedCode: null,
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:01.000Z',
      completedAt: '2026-07-29T00:00:01.000Z',
      blockedAt: null,
      failedAt: null,
      transitions: [
        {
          id: 't1',
          fromState: null,
          toState: 'requested',
          code: null,
          createdAt: '2026-07-29T00:00:00.000Z',
        },
      ],
      hasTransmission: true,
      transmissionOutcome: 'completed',
      transmission: {
        id: 'tr1',
        outcome: 'completed',
        promptTemplateId: 'review-run-orchestration-v1',
        schemaId: 'review-run-orchestration-v1',
        requestedModelAlias: 'deepseek-flash',
        resolvedModelId: 'deepseek-v4-flash',
        attemptCount: 1,
        latencyMs: 12,
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        providerRequestId: null,
        terminalCode: null,
        createdAt: '2026-07-29T00:00:01.000Z',
      },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="review-run-result"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="review-run-verdict"]')
        ?.textContent,
    ).toContain('ready_to_create');

    fixture.componentInstance.startReviewRun();
    fixture.detectChanges();
    const blockedReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/projects/11111111-1111-1111-1111-111111111111/review-runs`,
    );
    blockedReq.flush({
      status: 'ok',
      id: 'run-2',
      projectId: '11111111-1111-1111-1111-111111111111',
      stage: 'new',
      changeId: null,
      state: 'blocked',
      contextBundleId: null,
      manifestHash: null,
      disclosureApprovalId: null,
      previewSessionId: null,
      previewIntegrityHash: null,
      previewPolicyId: null,
      approvalPolicyId: null,
      budgetCheckStatus: null,
      promptTemplateId: null,
      modelAlias: null,
      resolvedModelId: null,
      schemaId: null,
      verdict: null,
      rationale: null,
      attemptCount: null,
      latencyMs: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      blockedCode: 'review_disclosure_approval_required',
      failedCode: null,
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:01.000Z',
      completedAt: null,
      blockedAt: '2026-07-29T00:00:01.000Z',
      failedAt: null,
      transitions: [],
      hasTransmission: false,
      transmissionOutcome: null,
      transmission: null,
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="review-run-blocked-code"]',
      )?.textContent,
    ).toContain('review_disclosure_approval_required');
  });
});
