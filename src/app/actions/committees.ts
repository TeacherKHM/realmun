"use server";

import { revalidatePath } from "next/cache";
import { requireDireccion } from "@/lib/auth";
import { guardSession, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Largo mínimo de las contraseñas nuevas (Supabase exige 6 por defecto). */
const MIN_PASSWORD = 10;

/** Contraseñas de fábrica que ya no deben volver a usarse. */
const DEFAULT_PASSWORDS = new Set(["comite-2026", "direccion-2026"]);

export type PasswordState = { ok: boolean; message: string | null };

/**
 * La dirección edita el catálogo de un comité: sigla, nombre, tema y acento.
 * Solo la dirección llega aquí (requireDireccion redirige a cualquier otra cuenta).
 */
export async function updateCommittee(formData: FormData) {
  await requireDireccion();

  const code = requireText(formData.get("code"), "comité");
  const sigla = requireText(formData.get("sigla"), "sigla");
  const name = requireText(formData.get("name"), "nombre del comité");
  const topic = optionalText(formData.get("topic"));
  const accent = optionalText(formData.get("accent"));

  const patch: { sigla: string; name: string; topic: string | null; accent?: string } = {
    sigla,
    name,
    topic,
  };
  // El acento se guarda solo si viene como color válido (#rrggbb).
  if (accent && HEX_COLOR.test(accent)) patch.accent = accent;

  const supabase = await createClient();
  const { error } = await supabase.from("committees").update(patch).eq("code", code);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/panel", "layout");
  revalidateConsole(code);
}

/** La dirección pone (o cambia) el nombre del encargado de un comité. */
export async function updateEncargado(formData: FormData) {
  await requireDireccion();

  const committeeId = requireText(formData.get("committee_id"), "comité");
  const displayName = optionalText(formData.get("display_name"));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("committee_id", committeeId)
    .eq("role", "encargado")
    .select("user_id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Ese comité todavía no tiene una cuenta de encargado.");
  }

  revalidatePath("/panel", "layout");
}

/**
 * La dirección cambia la contraseña compartida de un comité.
 * Usa el Admin API de Supabase con la clave secreta del servidor; la contraseña
 * nunca se guarda ni se registra en la app.
 */
export async function setCommitteePassword(
  code: string,
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await guardSession();
  if (session.role !== "direccion") {
    return { ok: false, message: "Solo la dirección puede cambiar contraseñas." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: `Usa al menos ${MIN_PASSWORD} caracteres.` };
  }
  if (password !== confirm) {
    return { ok: false, message: "Las dos contraseñas no coinciden." };
  }
  if (DEFAULT_PASSWORDS.has(password)) {
    return { ok: false, message: "Esa es la contraseña de fábrica: elige otra." };
  }

  if (!hasAdminKey()) {
    return {
      ok: false,
      message: "Falta SUPABASE_SECRET_KEY en el servidor; el cambio está desactivado.",
    };
  }

  const admin = createAdminClient();

  const { data: committee, error: committeeError } = await admin
    .from("committees")
    .select("id, sigla")
    .eq("code", code)
    .maybeSingle<{ id: string; sigla: string }>();

  if (committeeError) return { ok: false, message: committeeError.message };
  if (!committee) return { ok: false, message: "Ese comité no existe." };

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("committee_id", committee.id)
    .eq("role", "encargado")
    .maybeSingle<{ user_id: string }>();

  if (profileError) return { ok: false, message: profileError.message };
  if (!profile) return { ok: false, message: "Ese comité no tiene cuenta de encargado." };

  const { error } = await admin.auth.admin.updateUserById(profile.user_id, { password });
  if (error) {
    return {
      ok: false,
      message: `Supabase rechazó el cambio (${error.message}). Revisa la clave secreta del servidor.`,
    };
  }

  revalidatePath("/panel/comites");
  return { ok: true, message: `Contraseña de ${committee.sigla} actualizada.` };
}
