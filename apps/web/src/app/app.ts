import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import type {
  ContextSourceResolveOkDto,
  ProjectConfigurationVersionDto,
  ProjectDiscoveryDto,
  ProjectDto,
  ProjectErrorResponse,
  RegisterProjectResponse,
  ReviewStage,
} from '@specpilot/shared-contracts';
import {
  isContextSourceResolveOkDto,
  isProjectDto,
  isProjectErrorResponse,
  REVIEW_STAGES,
} from '@specpilot/shared-contracts';
import { environment } from '../environments/environment.local';

export type ShellState = 'loading' | 'success' | 'error';
export type RegistrationUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type ConfigurationUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DiscoveryUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type ContextResolveUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DashboardListState = 'idle' | 'loading' | 'success' | 'error';

/** Minimal i18n-ready copy boundary (Spanish default). */
export const shellCopy = {
  es: {
    brand: 'SpecPilot',
    tagline: 'Consola local de aseguramiento para entrega gobernada con OpenSpec.',
    loading: 'Cargando la consola…',
    errorTitle: 'No se pudo iniciar la consola',
    errorDetail: 'Revise la configuración de arranque e intente de nuevo.',
    emptyRegion: 'Sin contenido en esta región.',
    registerTitle: 'Registrar repositorio local',
    registerHint:
      'Indique la ruta absoluta de un repositorio que contenga .specpilot/project.yaml.',
    pathLabel: 'Ruta del repositorio',
    displayNameLabel: 'Nombre para mostrar (opcional)',
    submit: 'Registrar',
    emptyRegistry: 'Aún no hay proyectos registrados.',
    successTitle: 'Proyecto registrado',
    blockedTitle: 'Registro bloqueado',
    configAttachedTitle: 'Configuración adjunta',
    configBlockedTitle: 'Configuración bloqueada',
    refreshLabel: 'Actualizar configuración',
    refreshSuccessTitle: 'Configuración actualizada',
    refreshBlockedTitle: 'Actualización de configuración bloqueada',
    selectProjectHint:
      'Seleccione un proyecto registrado para actualizar configuración o descubrimiento (solo lectura).',
    discoveryRefreshLabel: 'Actualizar descubrimiento',
    discoveryEmpty: 'Aún no se ha inspeccionado este proyecto.',
    discoverySuccessTitle: 'Descubrimiento actualizado',
    discoveryBlockedTitle: 'Descubrimiento con incidencias',
    discoveryErrorTitle: 'Error al actualizar el descubrimiento',
    discoveryReadOnlyHint:
      'Inspección de solo lectura: SpecPilot no modifica el repositorio ni ejecuta flujos de entrega.',
    contextResolveTitle: 'Resolver fuentes de contexto',
    contextResolveHint:
      'Resolución de rutas de solo lectura por etapa (sin leer contenido ni enviar a proveedores).',
    contextResolveLabel: 'Resolver fuentes de contexto',
    contextStageLabel: 'Etapa de revisión',
    contextResolveIdle: 'Aún no se han resuelto fuentes de contexto para este proyecto.',
    contextResolveSuccessTitle: 'Fuentes de contexto resueltas',
    contextResolveEmptyTitle: 'Sin rutas candidatas',
    contextResolveBlockedTitle: 'Resolución de fuentes bloqueada',
    contextResolveErrorTitle: 'Error al resolver fuentes de contexto',
    contextShowingCap: 'Mostrando 200 de',
    contextShowingCapSuffix: 'rutas',
    dashboardTitle: 'Proyectos',
    dashboardHint:
      'Estado de descubrimiento según la última inspección persistida (sin re-probar al cargar).',
    dashboardEmpty: 'Aún no hay proyectos registrados.',
    dashboardLoading: 'Cargando proyectos…',
    dashboardError: 'No se pudo cargar el listado de proyectos.',
    dashboardHealthNever: 'Sin inspeccionar',
    dashboardHealthOk: 'Correcto',
    dashboardHealthBlocked: 'Con incidencias',
    dashboardHealthInvalid: 'Inválido',
    dashboardConfigAttached: 'Configuración activa',
    dashboardConfigMissing: 'Sin configuración activa',
    dashboardInspectedAt: 'Inspeccionado',
  },
} as const;

export type ShellLocale = keyof typeof shellCopy;

@Component({
  imports: [
    Card,
    Message,
    ProgressSpinner,
    Button,
    InputText,
    FormsModule,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  /** Optional bootstrap override for tests (invalid forces error). */
  readonly bootstrapMode = input<'ok' | 'invalid'>('ok');

  private readonly http = inject(HttpClient);
  private readonly locale = signal<ShellLocale>('es');
  private readonly state = signal<ShellState>('loading');

  readonly copy = computed(() => shellCopy[this.locale()]);
  readonly shellState = computed(() => this.state());

  readonly repositoryPath = signal('');
  readonly displayName = signal('');
  readonly registrationState = signal<RegistrationUiState>('idle');
  readonly projects = signal<ProjectDto[]>([]);
  readonly lastRegistered = signal<RegisterProjectResponse | null>(null);
  readonly registrationMessage = signal<string | null>(null);
  readonly selectedProjectId = signal<string | null>(null);
  readonly configurationState = signal<ConfigurationUiState>('idle');
  readonly configurationMessage = signal<string | null>(null);
  readonly lastConfiguration = signal<ProjectConfigurationVersionDto | null>(
    null,
  );
  readonly discoveryState = signal<DiscoveryUiState>('idle');
  readonly discoveryMessage = signal<string | null>(null);
  readonly lastDiscovery = signal<ProjectDiscoveryDto | null>(null);
  readonly dashboardListState = signal<DashboardListState>('idle');
  readonly reviewStages = REVIEW_STAGES;
  readonly selectedReviewStage = signal<ReviewStage>('planning');
  readonly contextResolveState = signal<ContextResolveUiState>('idle');
  readonly contextResolveMessage = signal<string | null>(null);
  readonly lastContextResolve = signal<ContextSourceResolveOkDto | null>(null);

  readonly displayedContextPaths = computed(() => {
    const result = this.lastContextResolve();
    if (!result) {
      return [] as string[];
    }
    return result.paths.slice(0, 200);
  });

  readonly contextPathCapCopy = computed(() => {
    const result = this.lastContextResolve();
    if (!result || result.pathCount <= 200) {
      return null;
    }
    const copy = this.copy();
    return `${copy.contextShowingCap} ${result.pathCount} ${copy.contextShowingCapSuffix}`;
  });

  ngOnInit(): void {
    queueMicrotask(() => this.completeBootstrap());
  }

  private completeBootstrap(): void {
    if (this.bootstrapMode() === 'invalid') {
      this.state.set('error');
      return;
    }
    this.state.set('success');
    queueMicrotask(() => this.refreshProjects());
  }

  discoveryHealthLabel(
    status: ProjectDto['discoveryHealth']['status'],
  ): string {
    const copy = this.copy();
    switch (status) {
      case 'never_inspected':
        return copy.dashboardHealthNever;
      case 'ok':
        return copy.dashboardHealthOk;
      case 'blocked':
        return copy.dashboardHealthBlocked;
      case 'invalid':
        return copy.dashboardHealthInvalid;
    }
  }

  refreshProjects(): void {
    this.dashboardListState.set('loading');
    this.http.get<unknown>(`${environment.apiBaseUrl}/projects`).subscribe({
      next: (payload) => {
        if (!Array.isArray(payload) || !payload.every(isProjectDto)) {
          // Fail closed: do not render a partial/invalid list as success.
          this.dashboardListState.set('error');
          return;
        }
        // Preserve API order (registeredAt DESC, id ASC); no client-side sort.
        this.projects.set(payload);
        this.dashboardListState.set('success');
        if (payload.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(payload[0]!.id);
        }
      },
      error: () => {
        this.dashboardListState.set('error');
        // Keep prior list if present; do not pretend empty solely on failure.
      },
    });
  }

  submitRegistration(): void {
    this.registrationState.set('loading');
    this.registrationMessage.set(null);
    this.lastRegistered.set(null);

    const body: { repositoryPath: string; displayName?: string } = {
      repositoryPath: this.repositoryPath(),
    };
    const name = this.displayName().trim();
    if (name.length > 0) {
      body.displayName = name;
    }

    this.http
      .post<RegisterProjectResponse>(`${environment.apiBaseUrl}/projects`, body)
      .subscribe({
        next: (project) => {
          this.lastRegistered.set(project);
          this.registrationState.set('success');
          if (project.configuration.status === 'blocked') {
            this.registrationMessage.set(project.configuration.error.message);
          } else {
            this.lastConfiguration.set(project.configuration.version);
          }
          this.selectedProjectId.set(project.id);
          this.refreshProjects();
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.registrationMessage.set(
            payload?.message ?? 'No se pudo completar el registro.',
          );
          const status =
            typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            typeof (err as { status: unknown }).status === 'number'
              ? (err as { status: number }).status
              : 0;
          this.registrationState.set(
            status === 422 || status === 409 ? 'blocked' : 'error',
          );
        },
      });
  }

  refreshConfiguration(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.configurationState.set('loading');
    this.configurationMessage.set(null);

    this.http
      .post<ProjectConfigurationVersionDto>(
        `${environment.apiBaseUrl}/projects/${id}/configuration/refresh`,
        {},
      )
      .subscribe({
        next: (version) => {
          this.lastConfiguration.set(version);
          this.configurationState.set('success');
          this.refreshProjects();
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.configurationMessage.set(
            payload?.message ?? 'No se pudo actualizar la configuración.',
          );
          const status =
            typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            typeof (err as { status: unknown }).status === 'number'
              ? (err as { status: number }).status
              : 0;
          this.configurationState.set(status === 422 ? 'blocked' : 'error');
        },
      });
  }

  refreshDiscovery(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.discoveryState.set('loading');
    this.discoveryMessage.set(null);

    this.http
      .post<ProjectDiscoveryDto>(
        `${environment.apiBaseUrl}/projects/${id}/discovery/refresh`,
        {},
      )
      .subscribe({
        next: (discovery) => {
          this.lastDiscovery.set(discovery);
          const blocked =
            discovery.git.status === 'blocked' ||
            discovery.openspec.status === 'blocked';
          this.discoveryState.set(blocked ? 'blocked' : 'success');
          if (blocked) {
            const parts: string[] = [];
            if (discovery.git.status === 'blocked') {
              parts.push(discovery.git.message);
            }
            if (discovery.openspec.status === 'blocked') {
              parts.push(discovery.openspec.message);
            }
            this.discoveryMessage.set(parts.join(' '));
          }
          this.refreshProjects();
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.discoveryMessage.set(
            payload?.message ?? 'No se pudo actualizar el descubrimiento.',
          );
          const status =
            typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            typeof (err as { status: unknown }).status === 'number'
              ? (err as { status: number }).status
              : 0;
          this.discoveryState.set(
            status === 422 || status === 404 ? 'blocked' : 'error',
          );
        },
      });
  }

  resolveContextSources(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.contextResolveState.set('loading');
    this.contextResolveMessage.set(null);
    this.lastContextResolve.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-sources/resolve`,
        { stage: this.selectedReviewStage() },
      )
      .subscribe({
        next: (payload) => {
          if (!isContextSourceResolveOkDto(payload)) {
            this.contextResolveState.set('error');
            this.contextResolveMessage.set(
              'La respuesta de resolución no es válida.',
            );
            return;
          }
          this.lastContextResolve.set(payload);
          this.contextResolveState.set('success');
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.contextResolveMessage.set(
            payload?.message ?? 'No se pudieron resolver las fuentes de contexto.',
          );
          const status =
            typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            typeof (err as { status: unknown }).status === 'number'
              ? (err as { status: number }).status
              : 0;
          this.contextResolveState.set(
            status === 422 || status === 404 ? 'blocked' : 'error',
          );
        },
      });
  }

  private extractError(err: unknown): ProjectErrorResponse | null {
    if (typeof err !== 'object' || err === null || !('error' in err)) {
      return null;
    }
    const body = (err as { error: unknown }).error;
    if (isProjectErrorResponse(body)) {
      return body;
    }
    // 422 blocked resolve DTO also carries message/code
    if (
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      'message' in body &&
      typeof (body as { code: unknown }).code === 'string' &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return {
        code: (body as { code: string }).code,
        message: (body as { message: string }).message,
      };
    }
    return null;
  }
}
