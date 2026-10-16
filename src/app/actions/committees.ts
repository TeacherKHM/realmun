"use server";

import { revalidatePath } from "next/cache";
import { requireDireccion } from "@/lib/auth";
import { optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

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
