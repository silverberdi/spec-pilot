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
  ContextBundleBlockedDto,
  ContextBundleOkDto,
  ContextDisclosureApprovalLatestListDto,
  ContextDisclosureApprovalOkDto,
  ContextDisclosurePreviewItemDto,
  ContextDisclosurePreviewOkDto,
  ContextDisclosureStatusOkDto,
  SecretScanBlockedDto,
  SecretScanOkDto,
  DeepseekProbeOkDto,
  DeepseekProbeStage,
  ReviewRunOkDto,
} from '@specpilot/shared-contracts';
import {
  DEEPSEEK_PROBE_STAGES,
  isContextBundleBlockedDto,
  isContextBundleLatestListDto,
  isContextBundleOkDto,
  isContextDisclosureApprovalLatestListDto,
  isContextDisclosureApprovalOkDto,
  isContextDisclosurePreviewOkDto,
  isContextDisclosureStatusOkDto,
  isContextSourceResolveOkDto,
  isDeepseekProbeOkDto,
  isProjectDto,
  isProjectErrorResponse,
  isReviewRunOkDto,
  isSecretScanBlockedDto,
  isSecretScanOkDto,
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
export type SecretScanUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type ContextBundleUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DisclosurePreviewUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DisclosureApprovalUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DisclosureStatusUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DisclosureLatestUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type DeepseekProbeUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'error';
export type ReviewRunUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'blocked'
  | 'empty'
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
    secretScanHint:
      'Análisis local de secretos en las rutas candidatas (sin vista previa, sin aprobación y sin envío a DeepSeek).',
    secretScanLabel: 'Analizar secretos en fuentes',
    secretScanIdle: 'Aún no se ha analizado secretos para este proyecto.',
    secretScanSuccessTitle: 'Análisis de secretos completado',
    secretScanEmptyTitle: 'Sin candidatos que analizar',
    secretScanExclusionsTitle: 'Análisis con exclusiones',
    secretScanBlockedTitle: 'Análisis de secretos bloqueado',
    secretScanErrorTitle: 'Error al analizar secretos',
    secretScanUnsafeTitle: 'Conjunto de contexto no seguro',
    secretFindingsCap: 'Mostrando 50 de',
    secretFindingsCapSuffix: 'hallazgos',
    contextBundleHint:
      'Manifiesto inmutable local con hashes y estimación de tokens (sin vista previa, sin aprobación y sin envío a DeepSeek).',
    contextBundleCreateLabel: 'Crear manifiesto de contexto',
    contextBundleLatestLabel: 'Cargar último manifiesto',
    contextBundleIdle: 'Aún no se ha creado un manifiesto de contexto para este proyecto.',
    contextBundleSuccessTitle: 'Manifiesto de contexto creado',
    contextBundleEmptyTitle: 'Manifiesto vacío',
    contextBundleBlockedTitle: 'Creación de manifiesto bloqueada',
    contextBundleErrorTitle: 'Error al crear el manifiesto de contexto',
    contextBundleUnsafeTitle: 'Conjunto de contexto no seguro',
    contextBundleEntriesCap: 'Mostrando 200 de',
    contextBundleEntriesCapSuffix: 'entradas',
    disclosureHint:
      'Vista previa acotada de la divulgación y aprobación explícita antes de un envío. La aprobación no envía contenido a DeepSeek; la vista previa expira en 15 minutos.',
    disclosureNeedBundleHint:
      'Cree o cargue un manifiesto de contexto para habilitar la vista previa de divulgación.',
    disclosurePreviewLabel: 'Vista previa',
    disclosureApproveLabel: 'Aprobar divulgación',
    disclosureStatusLabel: 'Consultar estado de divulgación',
    disclosureLatestLabel: 'Cargar última aprobación',
    disclosurePreviewIdle:
      'Aún no se ha generado una vista previa de divulgación para este manifiesto.',
    disclosurePreviewSuccessTitle: 'Vista previa de divulgación generada',
    disclosurePreviewEmptyTitle: 'Vista previa sin entradas',
    disclosurePreviewBlockedTitle: 'Vista previa de divulgación bloqueada',
    disclosurePreviewErrorTitle: 'Error al generar la vista previa de divulgación',
    disclosureItemsCap: 'Mostrando 20 de',
    disclosureItemsCapSuffix: 'entradas',
    disclosureExpiresLabel: 'Expira',
    disclosureNeedPreviewHint:
      'Genere una vista previa vigente antes de aprobar la divulgación.',
    disclosureApprovalIdle:
      'Aún no se ha aprobado la divulgación de la vista previa actual.',
    disclosureApprovalSuccessTitle: 'Divulgación aprobada (no transmitida)',
    disclosureApprovalBlockedTitle: 'Aprobación de divulgación bloqueada',
    disclosureApprovalErrorTitle: 'Error al aprobar la divulgación',
    disclosureStatusIdle: 'Aún no se ha consultado el estado de divulgación.',
    disclosureStatusSuccessTitle: 'Estado de divulgación',
    disclosureStatusBlockedTitle: 'No se pudo determinar el estado de divulgación',
    disclosureLatestIdle: 'Aún no hay una aprobación registrada para esta etapa.',
    disclosureLatestSuccessTitle: 'Última aprobación de divulgación',
    disclosureLatestBlockedTitle: 'No se pudo cargar la última aprobación',
    disclosureYes: 'sí',
    disclosureNo: 'no',
    deepseekProbeTitle: 'Prueba de conectividad DeepSeek',
    deepseekProbeHint:
      'Comprueba conectividad y salida estructurada con DeepSeek. No inicia una ejecución de revisión ni reserva presupuesto.',
    deepseekProbeLabel: 'Probar DeepSeek',
    deepseekProbeStageLabel: 'Etapa de prueba',
    deepseekProbeIdle:
      'Aún no se ha probado DeepSeek para este proyecto.',
    deepseekProbeSuccessTitle: 'Prueba DeepSeek completada',
    deepseekProbeBlockedTitle: 'Prueba DeepSeek bloqueada',
    deepseekProbeErrorTitle: 'Error al probar DeepSeek',
    deepseekProbeNeedProjectHint:
      'Seleccione un proyecto registrado para probar DeepSeek.',
    reviewRunTitle: 'Ejecución de revisión',
    reviewRunHint:
      'Inicia una revisión orquestada con el manifiesto y la aprobación de divulgación explícitos. El presupuesto aún no se aplica (not_enforced).',
    reviewRunLabel: 'Iniciar revisión',
    reviewRunStageLabel: 'Etapa de revisión',
    reviewRunBundleIdLabel: 'Identificador del manifiesto de contexto',
    reviewRunChangeIdLabel: 'Identificador del cambio (kebab-case)',
    reviewRunIdle:
      'Aún no se ha iniciado una ejecución de revisión para este proyecto.',
    reviewRunEmpty: 'No hay ejecuciones de revisión para mostrar.',
    reviewRunSuccessTitle: 'Ejecución de revisión completada',
    reviewRunBlockedTitle: 'Ejecución de revisión bloqueada',
    reviewRunFailedTitle: 'Ejecución de revisión fallida',
    reviewRunErrorTitle: 'Error al iniciar la revisión',
    reviewRunNeedProjectHint:
      'Seleccione un proyecto registrado para iniciar una revisión.',
    reviewRunBudgetNotEnforced:
      'Comprobación de presupuesto: not_enforced (aún no se aplica en este corte).',
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
  readonly secretScanState = signal<SecretScanUiState>('idle');
  readonly secretScanMessage = signal<string | null>(null);
  readonly lastSecretScan = signal<SecretScanOkDto | null>(null);
  readonly lastSecretScanBlocked = signal<SecretScanBlockedDto | null>(null);
  readonly contextBundleState = signal<ContextBundleUiState>('idle');
  readonly contextBundleMessage = signal<string | null>(null);
  readonly lastContextBundle = signal<ContextBundleOkDto | null>(null);
  readonly lastContextBundleBlocked = signal<ContextBundleBlockedDto | null>(
    null,
  );
  readonly disclosurePreviewState = signal<DisclosurePreviewUiState>('idle');
  readonly disclosurePreviewMessage = signal<string | null>(null);
  readonly lastDisclosurePreview =
    signal<ContextDisclosurePreviewOkDto | null>(null);
  readonly disclosureApprovalState =
    signal<DisclosureApprovalUiState>('idle');
  readonly disclosureApprovalMessage = signal<string | null>(null);
  readonly lastDisclosureApproval =
    signal<ContextDisclosureApprovalOkDto | null>(null);
  readonly disclosureStatusState = signal<DisclosureStatusUiState>('idle');
  readonly disclosureStatusMessage = signal<string | null>(null);
  readonly lastDisclosureStatus = signal<ContextDisclosureStatusOkDto | null>(
    null,
  );
  readonly disclosureLatestState = signal<DisclosureLatestUiState>('idle');
  readonly disclosureLatestMessage = signal<string | null>(null);
  readonly lastDisclosureLatestApproval =
    signal<ContextDisclosureApprovalOkDto | null>(null);
  readonly deepseekProbeStages = DEEPSEEK_PROBE_STAGES;
  readonly deepseekProbeStage = signal<DeepseekProbeStage>('discovery');
  readonly deepseekProbeState = signal<DeepseekProbeUiState>('idle');
  readonly deepseekProbeMessage = signal<string | null>(null);
  readonly lastDeepseekProbe = signal<DeepseekProbeOkDto | null>(null);

  readonly reviewRunStage = signal<ReviewStage>('new');
  readonly reviewRunContextBundleId = signal('');
  readonly reviewRunChangeId = signal('');
  readonly reviewRunState = signal<ReviewRunUiState>('idle');
  readonly reviewRunMessage = signal<string | null>(null);
  readonly lastReviewRun = signal<ReviewRunOkDto | null>(null);

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

  readonly displayedEligiblePaths = computed(() => {
    const result = this.lastSecretScan();
    if (!result) {
      return [] as string[];
    }
    return result.eligiblePaths.slice(0, 200);
  });

  readonly eligiblePathCapCopy = computed(() => {
    const result = this.lastSecretScan();
    if (!result || result.eligiblePathCount <= 200) {
      return null;
    }
    const copy = this.copy();
    return `${copy.contextShowingCap} ${result.eligiblePathCount} ${copy.contextShowingCapSuffix}`;
  });

  readonly displayedFindings = computed(() => {
    const result = this.lastSecretScan();
    if (!result) {
      return [] as SecretScanOkDto['findings'];
    }
    return result.findings.slice(0, 50);
  });

  readonly findingsCapCopy = computed(() => {
    const result = this.lastSecretScan();
    if (!result || result.findings.length <= 50) {
      return null;
    }
    const copy = this.copy();
    return `${copy.secretFindingsCap} ${result.findings.length} ${copy.secretFindingsCapSuffix}`;
  });

  readonly displayedBundleEntries = computed(() => {
    const result = this.lastContextBundle();
    if (!result) {
      return [] as ContextBundleOkDto['entries'];
    }
    return result.entries.slice(0, 200);
  });

  readonly bundleEntryCapCopy = computed(() => {
    const result = this.lastContextBundle();
    if (!result || result.entryCount <= 200) {
      return null;
    }
    const copy = this.copy();
    return `${copy.contextBundleEntriesCap} ${result.entryCount} ${copy.contextBundleEntriesCapSuffix}`;
  });

  readonly displayedDisclosureItems = computed(() => {
    const preview = this.lastDisclosurePreview();
    if (!preview) {
      return [] as ContextDisclosurePreviewItemDto[];
    }
    return preview.items.slice(0, 20);
  });

  readonly disclosureItemsCapCopy = computed(() => {
    const preview = this.lastDisclosurePreview();
    if (!preview || preview.itemCount <= 20) {
      return null;
    }
    const copy = this.copy();
    return `${copy.disclosureItemsCap} ${preview.itemCount} ${copy.disclosureItemsCapSuffix}`;
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

  formatDisclosureLineRanges(item: ContextDisclosurePreviewItemDto): string {
    return item.lineRanges
      .map((range) => `${range.startLine}-${range.endLine}`)
      .join(', ');
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

  runSecretScan(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.secretScanState.set('loading');
    this.secretScanMessage.set(null);
    this.lastSecretScan.set(null);
    this.lastSecretScanBlocked.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-sources/secret-scan`,
        { stage: this.selectedReviewStage() },
      )
      .subscribe({
        next: (payload) => {
          if (!isSecretScanOkDto(payload)) {
            this.secretScanState.set('error');
            this.secretScanMessage.set(
              'La respuesta del análisis de secretos no es válida.',
            );
            return;
          }
          this.lastSecretScan.set(payload);
          this.secretScanState.set('success');
        },
        error: (err: unknown) => {
          const body =
            typeof err === 'object' &&
            err !== null &&
            'error' in err
              ? (err as { error: unknown }).error
              : null;
          if (isSecretScanBlockedDto(body)) {
            this.lastSecretScanBlocked.set(body);
            this.secretScanMessage.set(body.message);
          } else {
            const payload = this.extractError(err);
            this.secretScanMessage.set(
              payload?.message ?? 'No se pudo analizar secretos en las fuentes.',
            );
          }
          const status =
            typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            typeof (err as { status: unknown }).status === 'number'
              ? (err as { status: number }).status
              : 0;
          this.secretScanState.set(
            status === 422 || status === 404 ? 'blocked' : 'error',
          );
        },
      });
  }

  createContextBundle(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.contextBundleState.set('loading');
    this.contextBundleMessage.set(null);
    this.lastContextBundle.set(null);
    this.lastContextBundleBlocked.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-bundles`,
        { stage: this.selectedReviewStage() },
      )
      .subscribe({
        next: (payload) => {
          if (!isContextBundleOkDto(payload)) {
            this.contextBundleState.set('error');
            this.contextBundleMessage.set(
              'La respuesta del manifiesto de contexto no es válida.',
            );
            return;
          }
          this.lastContextBundle.set(payload);
          this.contextBundleState.set('success');
        },
        error: (err: unknown) => {
          this.handleContextBundleError(err);
        },
      });
  }

  loadLatestContextBundle(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.contextBundleState.set('loading');
    this.contextBundleMessage.set(null);
    this.lastContextBundle.set(null);
    this.lastContextBundleBlocked.set(null);

    this.http
      .get<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-bundles`,
        {
          params: {
            stage: this.selectedReviewStage(),
            limit: '1',
          },
        },
      )
      .subscribe({
        next: (payload) => {
          if (!isContextBundleLatestListDto(payload)) {
            this.contextBundleState.set('error');
            this.contextBundleMessage.set(
              'La respuesta del último manifiesto no es válida.',
            );
            return;
          }
          const item = payload.items[0] ?? null;
          this.lastContextBundle.set(item);
          this.contextBundleState.set(item ? 'success' : 'idle');
          if (!item) {
            this.contextBundleMessage.set(this.copy().contextBundleIdle);
          }
        },
        error: (err: unknown) => {
          this.handleContextBundleError(err);
        },
      });
  }

  private handleContextBundleError(err: unknown): void {
    const body =
      typeof err === 'object' && err !== null && 'error' in err
        ? (err as { error: unknown }).error
        : null;
    if (isContextBundleBlockedDto(body)) {
      this.lastContextBundleBlocked.set(body);
      this.contextBundleMessage.set(body.message);
    } else {
      const payload = this.extractError(err);
      this.contextBundleMessage.set(
        payload?.message ?? 'No se pudo crear o cargar el manifiesto de contexto.',
      );
    }
    const status =
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 0;
    this.contextBundleState.set(
      status === 422 || status === 404 ? 'blocked' : 'error',
    );
  }

  previewDisclosure(): void {
    const id = this.selectedProjectId();
    const bundle = this.lastContextBundle();
    if (!id || !bundle) {
      return;
    }
    this.disclosurePreviewState.set('loading');
    this.disclosurePreviewMessage.set(null);
    this.lastDisclosurePreview.set(null);
    // A fresh preview invalidates any approval bound to a prior session.
    this.disclosureApprovalState.set('idle');
    this.disclosureApprovalMessage.set(null);
    this.lastDisclosureApproval.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-bundles/${bundle.id}/preview`,
        {},
      )
      .subscribe({
        next: (payload) => {
          if (!isContextDisclosurePreviewOkDto(payload)) {
            this.disclosurePreviewState.set('error');
            this.disclosurePreviewMessage.set(
              'La respuesta de la vista previa de divulgación no es válida.',
            );
            return;
          }
          this.lastDisclosurePreview.set(payload);
          this.disclosurePreviewState.set('success');
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.disclosurePreviewMessage.set(
            payload?.message ??
              'No se pudo generar la vista previa de divulgación.',
          );
          this.disclosurePreviewState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  approveDisclosure(): void {
    const id = this.selectedProjectId();
    const bundle = this.lastContextBundle();
    const preview = this.lastDisclosurePreview();
    if (!id || !bundle || !preview) {
      return;
    }
    this.disclosureApprovalState.set('loading');
    this.disclosureApprovalMessage.set(null);
    this.lastDisclosureApproval.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-bundles/${bundle.id}/disclosure-approvals`,
        {
          previewSessionId: preview.previewSessionId,
          manifestHash: preview.manifestHash,
          decision: 'approved',
        },
      )
      .subscribe({
        next: (payload) => {
          if (!isContextDisclosureApprovalOkDto(payload)) {
            this.disclosureApprovalState.set('error');
            this.disclosureApprovalMessage.set(
              'La respuesta de la aprobación de divulgación no es válida.',
            );
            return;
          }
          this.lastDisclosureApproval.set(payload);
          this.disclosureApprovalState.set('success');
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.disclosureApprovalMessage.set(
            payload?.message ?? 'No se pudo aprobar la divulgación.',
          );
          this.disclosureApprovalState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  refreshDisclosureStatus(): void {
    const id = this.selectedProjectId();
    const bundle = this.lastContextBundle();
    if (!id || !bundle) {
      return;
    }
    this.disclosureStatusState.set('loading');
    this.disclosureStatusMessage.set(null);

    this.http
      .get<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/context-bundles/${bundle.id}/disclosure-status`,
      )
      .subscribe({
        next: (payload) => {
          if (!isContextDisclosureStatusOkDto(payload)) {
            this.disclosureStatusState.set('error');
            this.disclosureStatusMessage.set(
              'La respuesta del estado de divulgación no es válida.',
            );
            return;
          }
          this.lastDisclosureStatus.set(payload);
          this.disclosureStatusState.set('success');
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.disclosureStatusMessage.set(
            payload?.message ??
              'No se pudo consultar el estado de divulgación.',
          );
          this.disclosureStatusState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  probeDeepseek(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.deepseekProbeState.set('loading');
    this.deepseekProbeMessage.set(null);
    this.lastDeepseekProbe.set(null);

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/deepseek/probe`,
        { stage: this.deepseekProbeStage() },
      )
      .subscribe({
        next: (payload) => {
          if (!isDeepseekProbeOkDto(payload)) {
            this.deepseekProbeState.set('error');
            this.deepseekProbeMessage.set(
              'La respuesta de la prueba DeepSeek no es válida.',
            );
            return;
          }
          this.lastDeepseekProbe.set(payload);
          this.deepseekProbeState.set('success');
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.deepseekProbeMessage.set(
            payload?.message ?? 'No se pudo completar la prueba DeepSeek.',
          );
          this.deepseekProbeState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  startReviewRun(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.reviewRunState.set('loading');
    this.reviewRunMessage.set(null);
    this.lastReviewRun.set(null);

    const stage = this.reviewRunStage();
    const body: Record<string, string> = {
      stage,
      contextBundleId: this.reviewRunContextBundleId().trim(),
    };
    if (stage !== 'new') {
      body['changeId'] = this.reviewRunChangeId().trim();
    }

    this.http
      .post<unknown>(
        `${environment.apiBaseUrl}/projects/${id}/review-runs`,
        body,
      )
      .subscribe({
        next: (payload) => {
          if (!isReviewRunOkDto(payload)) {
            this.reviewRunState.set('error');
            this.reviewRunMessage.set(
              'La respuesta de la ejecución de revisión no es válida.',
            );
            return;
          }
          this.lastReviewRun.set(payload);
          if (payload.state === 'completed') {
            this.reviewRunState.set('success');
          } else if (payload.state === 'blocked') {
            this.reviewRunState.set('blocked');
            this.reviewRunMessage.set(
              payload.blockedCode ??
                'La ejecución de revisión quedó bloqueada.',
            );
          } else if (payload.state === 'failed') {
            this.reviewRunState.set('error');
            this.reviewRunMessage.set(
              payload.failedCode ??
                'La ejecución de revisión falló.',
            );
          } else {
            this.reviewRunState.set('error');
            this.reviewRunMessage.set(
              'La ejecución no terminó en un estado esperado.',
            );
          }
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.reviewRunMessage.set(
            payload?.message ?? 'No se pudo iniciar la ejecución de revisión.',
          );
          this.reviewRunState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  loadLatestDisclosureApproval(): void {
    const id = this.selectedProjectId();
    if (!id) {
      return;
    }
    this.disclosureLatestState.set('loading');
    this.disclosureLatestMessage.set(null);
    this.lastDisclosureLatestApproval.set(null);

    this.http
      .get<unknown>(`${environment.apiBaseUrl}/projects/${id}/disclosure-approvals`, {
        params: {
          stage: this.selectedReviewStage(),
          limit: '1',
        },
      })
      .subscribe({
        next: (payload) => {
          if (!isContextDisclosureApprovalLatestListDto(payload)) {
            this.disclosureLatestState.set('error');
            this.disclosureLatestMessage.set(
              'La respuesta de la última aprobación no es válida.',
            );
            return;
          }
          const item = payload.items[0] ?? null;
          this.lastDisclosureLatestApproval.set(item);
          this.disclosureLatestState.set(item ? 'success' : 'idle');
          if (!item) {
            this.disclosureLatestMessage.set(this.copy().disclosureLatestIdle);
          }
        },
        error: (err: unknown) => {
          const payload = this.extractError(err);
          this.disclosureLatestMessage.set(
            payload?.message ?? 'No se pudo cargar la última aprobación.',
          );
          this.disclosureLatestState.set(
            this.blockedOrError(this.extractStatus(err)),
          );
        },
      });
  }

  private extractStatus(err: unknown): number {
    return typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 0;
  }

  private blockedOrError(status: number): 'blocked' | 'error' {
    return status === 422 || status === 404 ? 'blocked' : 'error';
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
