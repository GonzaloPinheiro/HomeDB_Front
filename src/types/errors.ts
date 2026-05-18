export const ErrorMessages: Record<number, string> = {
  1001: 'Archivo no encontrado',
  1002: 'Carpeta no encontrada',
  1003: 'No tienes permisos para realizar esta acción',
  1004: 'El archivo supera el límite de 500 MB',
  1005: 'La carpeta no está vacía',
  1006: 'Usuario o contraseña incorrectos',
  1007: 'Este nombre de usuario ya está en uso',
  1008: 'Usuario no encontrado',
  1009: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo',
  9999: 'Ha ocurrido un error interno. Inténtalo más tarde',
};

export function getErrorMessage(errorCode: number | null | undefined): string {
  if (errorCode == null) return 'Ha ocurrido un error inesperado';
  return ErrorMessages[errorCode] ?? 'Ha ocurrido un error inesperado';
}
