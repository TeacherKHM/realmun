import type { TvPayload } from "@/components/TvBoard";
import { createClient } from "@/lib/supabase/server";

/** Estado público que consume la pantalla de TV (sin datos sensibles). */
export async function loadTvPayload(code: string): Promise<TvPayload> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("committee_tv_stats", { p_code: code });
  const raw = (data ?? {}) as Partial<TvPayload>;

  return {
    now: new Date().toISOString(),
    committee: raw.committee ?? null,
    session: raw.session ?? null,
    delegates_total: raw.delegates_total ?? 0,
    presence: raw.presence ?? {},
    sanctions: raw.sanctions ?? {},
    resolutions: raw.resolutions ?? 0,
    timer: raw.timer ?? null,
  };
}
