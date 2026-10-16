"use server";

import { createClient } from "@/lib/supabase/server";
import { guardCommittee, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import type { SanctionType } from "@/lib/types";

const TYPES: SanctionType[] = ["amonestacion", "advertencia", "disciplina"];

export async function addSanction(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const delegateId = requireText(formData.get("delegate_id"), "delegado");
  const type = requireText(formData.get("type"), "tipo de sanción") as SanctionType;
  const reason = requireText(formData.get("reason"), "motivo");

  if (!TYPES.includes(type)) throw new Error("Tipo de sanción no válido");

  const supabase = await createClient();
  const { error } = await supabase.from("sanctions").insert({
    committee_id: committee.id,
    session_id: optionalText(formData.get("session_id")),
    delegate_id: delegateId,
    type,
    reason,
  });

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function deleteSanction(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const id = requireText(formData.get("sanction_id"), "sanción");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sanctions")
    .delete()
    .eq("id", id)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
