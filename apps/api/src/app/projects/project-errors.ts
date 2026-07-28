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
  internal_error: 'Ocurrió un error interno al registrar el proyecto.',
};

export class ProjectHttpError extends HttpException {
  constructor(status: number, code: ProjectErrorCode, message?: string) {
    super(
      { code, message: message ?? OPERATOR_MESSAGES[code] },
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
  code: 'project_not_found' | 'configuration_not_found' = 'project_not_found',
): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.NOT_FOUND, code);
}

export function internal500(
  code: 'internal_error' | 'configuration_refresh_failed' = 'internal_error',
): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.INTERNAL_SERVER_ERROR, code);
}
