import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import type {
  ProjectConfigurationVersionDto,
  ProjectDto,
  ProjectErrorResponse,
  RegisterProjectResponse,
} from '@specpilot/shared-contracts';
import { isProjectErrorResponse } from '@specpilot/shared-contracts';
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
    selectProjectHint: 'Seleccione un proyecto registrado para actualizar su configuración.',
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

  refreshProjects(): void {
    this.http.get<ProjectDto[]>(`${environment.apiBaseUrl}/projects`).subscribe({
      next: (list) => {
        this.projects.set(list);
        if (list.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(list[0]!.id);
        }
      },
      error: () => {
        // Empty-state still usable if list fails; keep prior list.
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

  private extractError(err: unknown): ProjectErrorResponse | null {
    if (typeof err !== 'object' || err === null || !('error' in err)) {
      return null;
    }
    const body = (err as { error: unknown }).error;
    return isProjectErrorResponse(body) ? body : null;
  }
}
