"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardCommittee } from "@/lib/guard";
import { requireDireccion } from "@/lib/auth";
import { revalidateConsole } from "@/lib/revalidate";
import { DEFAULT_RUBRIC_CRITERIA, type RubricCriterion } from "@/lib/types";

function slugKey(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
}

export async function updateRubricCriteria(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  await requireDireccion();

  const labels = formData.getAll("label") as string[];
  const hints = formData.getAll("hint") as string[];

  const criteria: RubricCriterion[] = labels
    .map((label, index) => ({
      key: slugKey(label) || `criterio_${index + 1}`,
      label: label.trim(),
      hint: String(hints[index] ?? "").trim() || undefined,
    }))
    .filter((c) => c.label.length > 0);

  const finalCriteria = criteria.length > 0 ? criteria : [...DEFAULT_RUBRIC_CRITERIA];

  const supabase = await createClient();
  const { error } = await supabase
    .from("committees")
    .update({ rubric_criteria: finalCriteria })
    .eq("id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
  revalidatePath("/panel/rubrica");
  revalidatePath("/panel");
}
