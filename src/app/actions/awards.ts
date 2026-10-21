"use server";

import { requireDireccion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getMunAwards() {
  await requireDireccion();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mun_awards");
  if (error) throw new Error(error.message);
  return data;
}
