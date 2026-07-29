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
});
