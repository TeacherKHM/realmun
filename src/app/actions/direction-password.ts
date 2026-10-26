"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDefaultPassword, MIN_PASSWORD } from "@/lib/passwords";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DirectionPasswordState = { ok: boolean; message: string | null };

const GENERIC_CURRENT_ERROR = "La contraseña actual no es correcta.";

/**
 * La dirección cambia su propia contraseña.
 * Primero se comprueba la contraseña actual con un cliente sin persistencia
 * (no toca las cookies de la sesión); después se aplica con el Admin API.
 */
export async function setDirectionPassword(
  _prev: DirectionPasswordState,
  formData: FormData,
): Promise<DirectionPasswordState> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a entrar." };
  }
  if (session.role !== "direccion") {
    return { ok: false, message: "Solo la dirección puede cambiar esta contraseña." };
  }

  const currentPassword = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!currentPassword) {
    return { ok: false, message: "Escribe tu contraseña actual." };
  }
  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: `Usa al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (password !== confirm) {
    return { ok: false, message: "Las dos contraseñas nuevas no coinciden." };
  }
  if (isDefaultPassword(password)) {
    return { ok: false, message: "Esa es la contraseña de fábrica: elige otra." };
  }
  if (password === currentPassword) {
    return { ok: false, message: "La contraseña nueva debe ser distinta de la actual." };
  }

  if (!hasAdminKey()) {
    return {
      ok: false,
      message: "Falta SUPABASE_SECRET_KEY en el servidor; el cambio está desactivado.",
    };
  }

  const email = session.email;
  if (!email) {
    return { ok: false, message: "No se pudo identificar la cuenta de dirección." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, message: "Falta la configuración pública de Supabase en el servidor." };
  }

  // Cliente aparte: verifica la contraseña sin crear ni reemplazar la sesión actual.
  const verifier = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    console.warn(
      "No se pudo verificar la contraseña actual de dirección:",
      verifyError.status,
      verifyError.message,
    );
    if (verifyError.message.toLowerCase().includes("captcha")) {
      return {
        ok: false,
        message: "No se pudo verificar la contraseña con el captcha. Intenta de nuevo.",
      };
    }
    return { ok: false, message: GENERIC_CURRENT_ERROR };
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(session.userId, {
    password,
  });

  if (error) {
    console.error("No se pudo cambiar la contraseña de dirección:", error.message);
    return {
      ok: false,
      message: "Supabase rechazó el cambio. Intenta de nuevo en un momento.",
    };
  }

  // Al cambiar la contraseña, Supabase invalida la sesión actual. Se cierra
  // de forma limpia y se vuelve al acceso para entrar con la contraseña nueva.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // La sesión ya quedó invalidada; el redirect es lo que importa.
  }

  redirect("/direccion?password=ok");
}
