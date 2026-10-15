/** Reglas de acceso de RealMUN. */

/**
 * Cada comité tiene una cuenta de encargado con este correo.
 * La contraseña se define en Supabase (ver MEMORY.md).
 */
export function committeeEmail(code: string) {
  return `${code}@realmun.mx`;
}

export const SCHOOL_NAME = "Instituto Real de San Luis";
export const EVENT_NAME = "RealMUN";
