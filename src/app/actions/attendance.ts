"use server";

import { createClient } from "@/lib/supabase/server";
import { guardCommittee, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import type { AttendanceStatus } from "@/lib/types";

const VALID: AttendanceStatus[] = ["presente", "ausente", "justificado", "retardo"];

export async function setAttendance(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const sessionId = requireText(formData.get("session_id"), "sesión");
  const delegateId = requireText(formData.get("delegate_id"), "delegado");
  const status = requireText(formData.get("status"), "estado") as AttendanceStatus;

  if (!VALID.includes(status)) throw new Error("Estado de asistencia no válido");

  const supabase = await createClient();
  const { error } = await supabase.from("attendance").upsert(
    {
      committee_id: committee.id,
      session_id: sessionId,
      delegate_id: delegateId,
      status,
      note: optionalText(formData.get("note")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,delegate_id" },
  );

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function markAllPresent(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const sessionId = requireText(formData.get("session_id"), "sesión");

  const supabase = await createClient();
  const { data: delegates } = await supabase
    .from("delegates")
    .select("id")
    .eq("committee_id", committee.id)
    .eq("active", true);

  const rows = (delegates ?? []).map((delegate: { id: string }) => ({
    committee_id: committee.id,
    session_id: sessionId,
    delegate_id: delegate.id,
    status: "presente" as AttendanceStatus,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "session_id,delegate_id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function clearAttendance(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const sessionId = requireText(formData.get("session_id"), "sesión");

  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("session_id", sessionId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
