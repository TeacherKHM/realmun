"use server";

import { createClient } from "@/lib/supabase/server";
import { guardSession, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";

export async function createSession(formData: FormData) {
  const { committee } = await guardSession();
  const title = requireText(formData.get("title"), "nombre de la sesión");
  const sessionDate = optionalText(formData.get("session_date")) ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      committee_id: committee.id,
      title,
      session_date: sessionDate,
      status: "activa",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la sesión");

  await supabase
    .from("committees")
    .update({ active_session_id: data.id })
    .eq("id", committee.id);

  revalidateConsole(committee.code);
}

export async function setActiveSession(formData: FormData) {
  const { committee } = await guardSession();
  const sessionId = requireText(formData.get("session_id"), "sesión");

  const supabase = await createClient();
  const { error } = await supabase
    .from("committees")
    .update({ active_session_id: sessionId })
    .eq("id", committee.id);

  if (error) throw new Error(error.message);

  revalidateConsole(committee.code);
}

export async function updateSessionStatus(formData: FormData) {
  const { committee } = await guardSession();
  const sessionId = requireText(formData.get("session_id"), "sesión");
  const status = requireText(formData.get("status"), "estado") === "finalizada" ? "finalizada" : "activa";

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);

  revalidateConsole(committee.code);
}

export async function deleteSession(formData: FormData) {
  const { committee } = await guardSession();
  const sessionId = requireText(formData.get("session_id"), "sesión");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);

  const { data: nextSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("committee_id", committee.id)
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  await supabase
    .from("committees")
    .update({ active_session_id: nextSession?.id ?? null })
    .eq("id", committee.id);

  revalidateConsole(committee.code);
}
