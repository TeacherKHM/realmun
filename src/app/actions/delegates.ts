"use server";

import { createClient } from "@/lib/supabase/server";
import { guardSession, optionalText, requireInt, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";

export async function createDelegate(formData: FormData) {
  const { committee } = await guardSession();
  const name = requireText(formData.get("name"), "nombre del delegado");
  const delegation = optionalText(formData.get("delegation"));

  const supabase = await createClient();
  const { error } = await supabase.from("delegates").insert({
    committee_id: committee.id,
    name,
    delegation,
    sort_order: requireInt(formData.get("sort_order"), 0),
  });

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function updateDelegate(formData: FormData) {
  const { committee } = await guardSession();
  const id = requireText(formData.get("delegate_id"), "delegado");

  const supabase = await createClient();
  const { error } = await supabase
    .from("delegates")
    .update({
      name: requireText(formData.get("name"), "nombre del delegado"),
      delegation: optionalText(formData.get("delegation")),
      active: formData.get("active") === "on" || formData.get("active") === "true",
      sort_order: requireInt(formData.get("sort_order"), 0),
    })
    .eq("id", id)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function toggleDelegate(formData: FormData) {
  const { committee } = await guardSession();
  const id = requireText(formData.get("delegate_id"), "delegado");
  const active = formData.get("active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("delegates")
    .update({ active })
    .eq("id", id)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function deleteDelegate(formData: FormData) {
  const { committee } = await guardSession();
  const id = requireText(formData.get("delegate_id"), "delegado");

  const supabase = await createClient();
  const { error } = await supabase
    .from("delegates")
    .delete()
    .eq("id", id)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
