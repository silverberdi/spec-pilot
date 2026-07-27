import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProjectErrorCode } from '@specpilot/shared-contracts';

const OPERATOR_MESSAGES: Record<ProjectErrorCode, string> = {
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

export function notFound404(): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.NOT_FOUND, 'project_not_found');
}

export function internal500(): ProjectHttpError {
  return new ProjectHttpError(HttpStatus.INTERNAL_SERVER_ERROR, 'internal_error');
}
