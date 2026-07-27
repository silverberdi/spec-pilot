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

  it('shows loading then success after register 201', async () => {
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
      },
    ]);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="registration-success"]'),
    ).toBeTruthy();
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
});
