"use server";

import { createClient } from "@/lib/supabase/server";
import { guardCommittee, optionalText, requireInt } from "@/lib/guard";
import { revalidateConsole } from "@/lib/revalidate";
import type { TimerMode, TimerState } from "@/lib/types";

type Patch = Partial<
  Pick<
    TimerState,
    "mode" | "running" | "label" | "speaker" | "ends_at" | "remaining_ms" | "started_at" | "elapsed_ms"
  >
>;

async function writeTimer(committeeId: string, patch: Patch) {
  const supabase = await createClient();
  const { error } = await supabase.from("timer_state").upsert(
    {
      committee_id: committeeId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "committee_id" },
  );
  if (error) throw new Error(error.message);
}

async function currentTimer(committeeId: string): Promise<TimerState | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timer_state")
    .select(
      "committee_id, mode, running, label, speaker, ends_at, remaining_ms, started_at, elapsed_ms, updated_at",
    )
    .eq("committee_id", committeeId)
    .maybeSingle<TimerState>();
  return data ?? null;
}

/**
 * Un solo punto de entrada para el cronómetro, con el campo oculto `intent`:
 * start | pause | resume | reset | speaker | mode
 */
export async function timerCommand(code: string, formData: FormData) {
  const { committee } = await guardCommittee(code);
  const intent = String(formData.get("intent") ?? "");
  const now = Date.now();
  const state = await currentTimer(committee.id);

  switch (intent) {
    case "start": {
      const minutesRaw = formData.get("minutes");
      const seconds = minutesRaw
        ? Math.max(1, requireInt(minutesRaw, 3)) * 60
        : Math.max(1, requireInt(formData.get("seconds"), 60));
      const mode: TimerMode = formData.get("mode") === "countup" ? "countup" : "countdown";
      const label = optionalText(formData.get("label"));

      if (mode === "countup") {
        await writeTimer(committee.id, {
          mode,
          running: true,
          label,
          started_at: new Date(now).toISOString(),
          ends_at: null,
          remaining_ms: null,
          elapsed_ms: null,
        });
      } else {
        await writeTimer(committee.id, {
          mode,
          running: true,
          label,
          ends_at: new Date(now + seconds * 1000).toISOString(),
          remaining_ms: null,
          started_at: null,
          elapsed_ms: null,
        });
      }
      break;
    }

    case "pause": {
      if (!state) break;
      if (state.mode === "countdown") {
        const endsAt = state.ends_at ? new Date(state.ends_at).getTime() : now;
        await writeTimer(committee.id, { running: false, remaining_ms: Math.max(0, endsAt - now) });
      } else {
        const startedAt = state.started_at ? new Date(state.started_at).getTime() : now;
        await writeTimer(committee.id, { running: false, elapsed_ms: Math.max(0, now - startedAt) });
      }
      break;
    }

    case "resume": {
      if (!state) break;
      if (state.mode === "countdown") {
        const remaining = state.remaining_ms ?? 60_000;
        if (remaining <= 0) break;
        await writeTimer(committee.id, {
          running: true,
          ends_at: new Date(now + remaining).toISOString(),
          remaining_ms: null,
        });
      } else {
        await writeTimer(committee.id, {
          running: true,
          started_at: new Date(now).toISOString(),
          ends_at: null,
          remaining_ms: null,
        });
      }
      break;
    }

    case "reset": {
      await writeTimer(committee.id, {
        running: false,
        ends_at: null,
        remaining_ms: null,
        started_at: null,
        elapsed_ms: null,
      });
      break;
    }

    case "mode": {
      const mode: TimerMode = formData.get("mode") === "countup" ? "countup" : "countdown";
      await writeTimer(committee.id, {
        mode,
        running: false,
        ends_at: null,
        remaining_ms: null,
        started_at: null,
        elapsed_ms: null,
      });
      break;
    }

    case "speaker": {
      await writeTimer(committee.id, { speaker: optionalText(formData.get("speaker")) });
      break;
    }

    case "label": {
      await writeTimer(committee.id, { label: optionalText(formData.get("label")) });
      break;
    }

    default:
      throw new Error("Comando de cronómetro desconocido");
  }

  revalidateConsole(committee.code);
}
