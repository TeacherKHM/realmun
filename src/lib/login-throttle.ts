import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fallos por cuenta + IP antes de bloquear. */
const MAX_FAILURES = 5;
/** Fallos por IP (repartidos entre cuentas) antes de bloquear. */
const IP_MAX_FAILURES = 20;
/** Ventana de observación y duración del bloqueo. */
const WINDOW_MINUTES = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ThrottleGate = { locked: boolean; retryMinutes: number };

/** IP del cliente detrás de Vercel. */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "sin-ip";
}

/** La IP y el correo se guardan hasheados; la tabla no expone datos personales. */
function digest(value: string) {
  const salt = process.env.LOGIN_HASH_SALT ?? "realmun-login";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

const OPEN: ThrottleGate = { locked: false, retryMinutes: 0 };

/**
 * Consulta si esta cuenta + IP está bloqueada. Si la clave secreta no está
 * configurada, el control queda inactivo (no se rompe el login).
 */
export async function checkThrottle(email: string, ip: string): Promise<ThrottleGate> {
  try {
    const admin = createAdminClient();
    const account = digest(email.toLowerCase());
    const ipHash = digest(ip);
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

    const [{ count: accountFailures, error: accountError }, { count: ipFailures, error: ipError }] =
      await Promise.all([
        admin
          .from("login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("account", account)
          .eq("ip_hash", ipHash)
          .eq("ok", false)
          .gte("created_at", since),
        admin
          .from("login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .eq("ok", false)
          .gte("created_at", since),
      ]);

    if (accountError || ipError) {
      console.warn("El control de intentos no pudo consultar la tabla:", accountError ?? ipError);
      return OPEN;
    }

    const locked = (accountFailures ?? 0) >= MAX_FAILURES || (ipFailures ?? 0) >= IP_MAX_FAILURES;
    return { locked, retryMinutes: locked ? WINDOW_MINUTES : 0 };
  } catch (error) {
    console.warn("Control de intentos no disponible:", error);
    return OPEN;
  }
}

/** Registra el intento y limpia los fallos previos cuando el acceso fue correcto. */
export async function recordAttempt(email: string, ip: string, ok: boolean) {
  try {
    const admin = createAdminClient();
    const account = digest(email.toLowerCase());
    const ipHash = digest(ip);

    await admin.from("login_attempts").insert({ account, ip_hash: ipHash, ok });

    if (ok) {
      await admin
        .from("login_attempts")
        .delete()
        .eq("account", account)
        .eq("ip_hash", ipHash)
        .eq("ok", false);
    }

    await admin
      .from("login_attempts")
      .delete()
      .lt("created_at", new Date(Date.now() - DAY_MS).toISOString());
  } catch (error) {
    console.warn("No se pudo registrar el intento de acceso:", error);
  }
}
