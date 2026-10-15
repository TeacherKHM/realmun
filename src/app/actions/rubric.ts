"use server";

import { createClient } from "@/lib/supabase/server";
import { guardSession, optionalText, requireText } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import { RUBRIC_CRITERIA, RUBRIC_SCALE, type RubricScore } from "@/lib/types";

export async function saveRubric(formData: FormData) {
  const { committee } = await guardSession();
  const sessionId = requireText(formData.get("session_id"), "sesión");
  const delegateId = requireText(formData.get("delegate_id"), "delegado");

  const scores: RubricScore[] = RUBRIC_CRITERIA.map((criterion) => {
    const raw = Number.parseInt(String(formData.get(`score_${criterion.key}`) ?? ""), 10);
    const score = Number.isFinite(raw)
      ? Math.min(RUBRIC_SCALE.max, Math.max(RUBRIC_SCALE.min, raw))
      : RUBRIC_SCALE.min;
    return { key: criterion.key, label: criterion.label, score };
  });

  const supabase = await createClient();
  const { error } = await supabase.from("rubric_scores").upsert(
    {
      committee_id: committee.id,
      session_id: sessionId,
      delegate_id: delegateId,
      scores,
      comment: optionalText(formData.get("comment")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,delegate_id" },
  );

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}

export async function clearRubric(formData: FormData) {
  const { committee } = await guardSession();
  const sessionId = requireText(formData.get("session_id"), "sesión");
  const delegateId = requireText(formData.get("delegate_id"), "delegado");

  const supabase = await createClient();
  const { error } = await supabase
    .from("rubric_scores")
    .delete()
    .eq("session_id", sessionId)
    .eq("delegate_id", delegateId)
    .eq("committee_id", committee.id);

  if (error) throw new Error(error.message);
  revalidateConsole(committee.code);
}
