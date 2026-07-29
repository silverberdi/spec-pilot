import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProjectErrorCode } from '@specpilot/shared-contracts';

export const OPERATOR_MESSAGES: Record<ProjectErrorCode, string> = {
  empty_repository_path: 'La ruta del repositorio está vacía.',
  relative_repository_path: 'La ruta del repositorio debe ser absoluta.',
  repository_not_found: 'No se encontró el repositorio en la ruta indicada.',
  repository_not_directory: 'La ruta no apunta a un directorio.',
  repository_not_readable: 'El directorio del repositorio no es legible.',
  project_yaml_missing:
    'Falta el archivo obligatorio .specpilot/project.yaml en el repositorio.',
  project_yaml_not_regular_file:
    '.specpilot/project.yaml debe ser un archivo regular.',
  invalid_derived_slug:
    'No se pudo derivar un slug kebab-case válido desde el nombre del directorio.',
  invalid_display_name:
    'El nombre para mostrar no es válido o supera el máximo de 120 caracteres.',
  duplicate_repository_path:
    'Ya existe un proyecto registrado para este directorio (ruta canónica).',
  duplicate_project_slug:
    'Ya existe un proyecto con el mismo slug derivado del directorio.',
  project_not_found: 'No se encontró el proyecto solicitado.',
  configuration_not_found:
    'El proyecto no tiene una configuración activa validada.',
  project_yaml_too_large:
    '.specpilot/project.yaml supera el tamaño máximo permitido (256 KiB).',
  project_yaml_parse_error:
    'No se pudo interpretar .specpilot/project.yaml como YAML válido.',
  unsupported_schema_version:
    'schemaVersion no soportado; se requiere schemaVersion: 1.',
  invalid_machine_id:
    'Los identificadores de máquina deben usar kebab-case en minúsculas.',
  invalid_repository_contract:
    'El bloque repository del contrato portable no es válido.',
  invalid_executor: 'executor.tool debe ser cursor.',
  invalid_validation_assistant:
    'Los asistentes de validación no pueden obtener autoridad de escritura.',
  invalid_budget_declaration:
    'review.monthlyBudgetUsd debe ser un número finito mayor o igual a 0.',
  invalid_context_patterns:
    'Los patrones context.include / context.exclude no son válidos.',
  configuration_attach_failed:
    'El proyecto se registró, pero no se pudo adjuntar la configuración.',
  configuration_refresh_failed:
    'Ocurrió un error interno al actualizar la configuración.',
  not_a_git_repository: 'La ruta no es un repositorio Git de trabajo.',
  git_inspect_failed: 'No se pudo inspeccionar el estado Git del repositorio.',
  git_inspection_timeout:
    'La inspección Git superó el tiempo máximo permitido.',
  openspec_root_missing:
    'No se encontró el directorio openspec en el repositorio.',
  openspec_inspect_failed:
    'No se pudo inspeccionar el estado OpenSpec del repositorio.',
  openspec_path_escape:
    'Se detectó una ruta fuera del repositorio canónico durante el descubrimiento OpenSpec.',
  openspec_inspection_limit_exceeded:
    'Se superó el límite de recorrido del descubrimiento OpenSpec.',
  discovery_not_found:
    'El proyecto aún no tiene un descubrimiento inspeccionado.',
  discovery_refresh_failed:
    'Ocurrió un error interno al actualizar el descubrimiento.',
  invalid_review_stage:
    'La etapa de revisión no es válida; use new, planning, applied o verify.',
  context_path_escape:
    'Se detectó un enlace simbólico fuera del repositorio canónico.',
  context_entry_unreadable:
    'No se pudo leer una entrada del repositorio durante la resolución de fuentes.',
  context_resolution_limit_exceeded:
    'Se superó el límite de recorrido o de rutas durante la resolución de fuentes.',
  context_resolution_timeout:
    'La resolución de fuentes de contexto superó el tiempo máximo permitido.',
  context_resolve_failed:
    'Ocurrió un error interno al resolver las fuentes de contexto.',
  unsafe_context_bundle:
    'El conjunto de contexto no es seguro: todos los candidatos fueron excluidos por secretos o contenido no escaneable.',
  secret_scan_limit_exceeded:
    'Se superó el límite de bytes leídos durante el análisis de secretos.',
  secret_scan_timeout:
    'El análisis de secretos superó el tiempo máximo permitido.',
  secret_scan_entry_unreadable:
    'No se pudo leer un archivo candidato de forma segura durante el análisis de secretos.',
  secret_scan_failed:
    'Ocurrió un error interno al analizar secretos en las fuentes de contexto.',
  context_bundle_failed:
    'Ocurrió un error interno al crear el manifiesto de contexto.',
  context_bundle_not_found:
    'No se encontró el manifiesto de contexto solicitado.',
  invalid_context_bundle_query:
    'La consulta de manifiestos de contexto no es válida; use stage y limit=1.',
  disclosure_preview_required:
    'Se requiere una vista previa válida y vigente antes de aprobar la divulgación.',
  disclosure_preview_expired:
    'La vista previa expiró; genere una nueva antes de aprobar la divulgación.',
  disclosure_preview_binding_mismatch:
    'La vista previa no corresponde exactamente a este manifiesto de contexto.',
  disclosure_manifest_mismatch:
    'El manifestHash de la solicitud no coincide con el del manifiesto de contexto.',
  disclosure_preview_policy_mismatch:
    'La política de vista previa cambió; genere una nueva vista previa antes de aprobar.',
  disclosure_preview_integrity_mismatch:
    'El contenido en disco ya no coincide con la vista previa; no se puede aprobar la divulgación.',
  disclosure_preview_entry_unreadable:
    'No se pudo leer de forma segura una entrada del manifiesto durante la vista previa.',
  disclosure_preview_limit_exceeded:
    'Se superó el límite de bytes o de puntos de código durante la vista previa.',
  disclosure_preview_timeout:
    'La vista previa o la verificación de aprobación superó el tiempo máximo permitido.',
  invalid_disclosure_approval:
    'La solicitud de aprobación de divulgación no es válida.',
  invalid_disclosure_approval_query:
    'La consulta de aprobaciones de divulgación no es válida; use stage y limit=1.',
  disclosure_preview_failed:
    'Ocurrió un error interno al generar la vista previa de divulgación.',
  disclosure_approval_failed:
    'Ocurrió un error interno al registrar la aprobación de divulgación.',
  internal_error: 'Ocurrió un error interno al registrar el proyecto.',
};

export class ProjectHttpError extends HttpException {
  constructor(
    status: number,
    code: ProjectErrorCode,
    message?: string,
    body?: Record<string, unknown>,
  ) {
    super(
      body ?? { code, message: message ?? OPERATOR_MESSAGES[code] },
      status,
    );
  }
}

export function blocked422(code: ProjectErrorCode): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.UNPROCESSABLE_ENTITY, code);
}

export function conflict409(code: 'duplicate_repository_path' | 'duplicate_project_slug'): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.CONFLICT, code);
}

export function notFound404(
  code:
    | 'project_not_found'
    | 'configuration_not_found'
    | 'discovery_not_found'
    | 'context_bundle_not_found' = 'project_not_found',
): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.NOT_FOUND, code);
}

export function internal500(
  code:
    | 'internal_error'
    | 'configuration_refresh_failed'
    | 'discovery_refresh_failed'
    | 'context_resolve_failed'
    | 'secret_scan_failed'
    | 'context_bundle_failed'
    | 'disclosure_preview_failed'
    | 'disclosure_approval_failed' = 'internal_error',
): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.INTERNAL_SERVER_ERROR, code);
}
