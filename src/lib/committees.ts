/** Reglas de acceso de RealMUN. */

/**
 * Cada comité tiene una cuenta de encargado con este correo.
 * La contraseña se define en Supabase (ver MEMORY.md).
 */
export function committeeEmail(code: string) {
  return `${code}@realmun.mx`;
}

/** Valor del selector de acceso que identifica a la dirección (no es un comité). */
export const DIRECCION_CODE = "direccion";

/** Cuenta única de la dirección: presidente o encargado general del modelo. */
export function direccionEmail() {
  return "direccion@realmun.mx";
}

export const SCHOOL_NAME = "Instituto Real de San Luis";
export const EVENT_NAME = "RealMUN";
