"use server";

import { createClient } from "@/lib/supabase/server";
import { guardSession, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";

export async function addResolution(formData: FormData) {
  const { committee } = await guardSession();
  const delegateId = requireText(formData.get("delegate_id"), "delegado");
  const sessionId = optionalText(formData.get("session_id"));
  const notes = optionalText(formData.get("notes"));

  const supabase = await createClient();

  // La versión se calcula sola: v1, v2, v3… por delegado y sesión.
  const { data: last } = await supabase
    .from("resolutions")
    .select("version")
    .eq("committee_id", committee.id)
    .eq("delegate_id", delegateId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ version: number }>();

  const { error } = await supabase.from("resolutions").insert({
    committee_id: committee.id,
    session_id: sessionId,
    delegate_id: delegateId,
    version: (last?.version ?? 0) + 1,
    notes,
  });

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function deleteResolution(formData: FormData) {
  const { committee } = await guardSession();
  const id = requireText(formData.get("resolution_id"), "hoja de resolución");

  const supabase = await createClient();
  const { error } = await supabase
    .from("resolutions")
    .delete()
    .eq("id", id)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
