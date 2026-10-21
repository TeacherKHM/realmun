"use server";

import { createClient } from "@/lib/supabase/server";
import { guardCommittee, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";

export async function createResolutionGroup(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const sessionId = optionalText(formData.get("session_id"));
  const name = requireText(formData.get("name"), "nombre de la alianza/resolución");
  const sponsorsRaw = optionalText(formData.get("sponsors")) ?? "";
  const notes = optionalText(formData.get("notes"));
  const sponsors = sponsorsRaw
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.from("resolution_groups").insert({
    committee_id: committee.id,
    session_id: sessionId,
    name,
    sponsors,
    notes,
  });

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function setResolutionVote(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const sessionId = optionalText(formData.get("session_id"));
  const groupId = requireText(formData.get("resolution_group_id"), "resolución");
  const round = Number.parseInt(String(formData.get("round") ?? "1"), 10);
  const delegateId = requireText(formData.get("delegate_id"), "delegado");
  const vote = requireText(formData.get("vote"), "voto");

  if (![1, 2, 3].includes(round)) throw new Error("Ronda inválida");
  if (round === 3 && vote === "abstencion") throw new Error("En la tercera ronda solo se vota a favor o en contra");
  if (!["a_favor", "en_contra", "abstencion"].includes(vote)) throw new Error("Voto inválido");

  const supabase = await createClient();
  const { error } = await supabase.from("resolution_votes").upsert(
    {
      committee_id: committee.id,
      session_id: sessionId,
      resolution_group_id: groupId,
      round,
      delegate_id: delegateId,
      vote,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "resolution_group_id,round,delegate_id" },
  );

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function finalizeResolutionGroup(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const groupId = requireText(formData.get("resolution_group_id"), "resolución");
  const status = requireText(formData.get("status"), "resultado");

  if (!["aprobado", "rechazado"].includes(status)) throw new Error("Resultado inválido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("resolution_groups")
    .update({ status })
    .eq("id", groupId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function deleteResolutionGroup(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const groupId = requireText(formData.get("resolution_group_id"), "resolución");

  const supabase = await createClient();
  const { error } = await supabase
    .from("resolution_groups")
    .delete()
    .eq("id", groupId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
