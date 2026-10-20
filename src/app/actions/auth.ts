"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { committeeEmail, DIRECCION_CODE, direccionEmail } from "@/lib/committees";
import { checkThrottle, clientIp, recordAttempt } from "@/lib/login-throttle";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/** Mismo mensaje para cuenta inexistente y contraseña incorrecta. */
const GENERIC_ERROR = "La contraseña no coincide con esa cuenta.";

/** Solo rutas internas: evita `//otro-dominio` y las barras invertidas. */
function safeNext(value: string) {
  const next = value.trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "";
  return next;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("committee") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!code || !password) {
    return { error: "Elige un comité y escribe la contraseña." };
  }

  const isDireccion = code === DIRECCION_CODE;
  const email = isDireccion ? direccionEmail() : committeeEmail(code);
  const ip = clientIp(await headers());

  // Antes de tocar Supabase: si esta cuenta+IP ya falló demasiado, no se intenta.
  const gate = await checkThrottle(email, ip);
  if (gate.locked) {
    return {
      error: `Demasiados intentos fallidos. Vuelve a intentarlo en unos ${gate.retryMinutes} minutos.`,
    };
  }

  const captchaToken = String(formData.get("captchaToken") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    // Diagnóstico del servidor: nunca se registra la contraseña.
    console.warn("Intento de acceso fallido:", error.status, error.message);
    await recordAttempt(email, ip, false);

    if (error.message.toLowerCase().includes("captcha")) {
      return { error: "No se pudo verificar el captcha. Recarga la página e intenta de nuevo." };
    }
    return { error: GENERIC_ERROR };
  }

  await recordAttempt(email, ip, true);

  const home = isDireccion ? "/panel" : `/comite/${code}`;
  redirect(next || home);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
