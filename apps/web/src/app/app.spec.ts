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
    expect(el.querySelector('[data-testid="empty-registry"]')).toBeTruthy();
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
});
