/** Reglas compartidas para las contraseñas de comités y de la dirección. */

/** Largo mínimo de las contraseñas nuevas (Supabase exige 6 por defecto). */
export const MIN_PASSWORD = 10;

/** Contraseñas de fábrica que ya no deben volver a usarse. */
const DEFAULT_PASSWORDS = new Set(["comite-2026", "direccion-2026"]);

export function isDefaultPassword(password: string) {
  return DEFAULT_PASSWORDS.has(password);
}
