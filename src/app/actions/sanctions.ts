"use server";

import { createClient } from "@/lib/supabase/server";
import { guardCommittee, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import { SANCTION_ORDER, type SanctionType } from "@/lib/types";

export async function addSanction(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const delegateId = requireText(formData.get("delegate_id"), "delegado");
  const type = requireText(formData.get("type"), "tipo de sanción") as SanctionType;
  const reason = requireText(formData.get("reason"), "motivo");

  if (!SANCTION_ORDER.includes(type)) throw new Error("Tipo de sanción no válido");

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_sanction", {
    p_committee_id: committee.id,
    p_session_id: optionalText(formData.get("session_id")),
    p_delegate_id: delegateId,
    p_type: type,
    p_reason: reason,
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
