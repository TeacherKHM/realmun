import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Clave secreta de Supabase (Project Settings → API Keys → secret key).
 * Sustituye a la antigua `service_role`: el gateway la traduce a ese rol.
 * Nunca debe llevar prefijo NEXT_PUBLIC_ ni llegar al navegador.
 */
function adminCredentials() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/** ¿Está configurada la clave secreta? Sin ella no se pueden cambiar contraseñas. */
export function hasAdminKey() {
  const { url, secret } = adminCredentials();
  return Boolean(url && secret);
}

/** Cliente con privilegios de administración. Solo para server actions. */
export function createAdminClient() {
  const { url, secret } = adminCredentials();
  if (!url || !secret) {
    throw new Error("Falta SUPABASE_SECRET_KEY en el servidor.");
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AdminKeyState = "ok" | "missing" | "invalid";

let cached: { at: number; state: AdminKeyState } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Comprueba de verdad que la clave secreta funciona (una petición pequeña al
 * Admin API, cacheada unos minutos). Así el panel no ofrece un botón que va a
 * fallar: si la clave está mal, lo dice.
 */
export async function adminKeyStatus(): Promise<AdminKeyState> {
  if (!hasAdminKey()) return "missing";
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.state;

  let state: AdminKeyState = "invalid";
  try {
    const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    state = error ? "invalid" : "ok";
  } catch (error) {
    console.warn("No se pudo comprobar la clave secreta:", error);
  }

  cached = { at: Date.now(), state };
  return state;
}

