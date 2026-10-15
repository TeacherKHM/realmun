import { formatDuration } from "@/lib/format";
import type { TimerState } from "@/lib/types";

export function timerMilliseconds(state: TimerState, nowMs: number) {
  if (state.mode === "countdown") {
    if (state.running && state.ends_at) return new Date(state.ends_at).getTime() - nowMs;
    return state.remaining_ms ?? 0;
  }
  if (state.running && state.started_at) return nowMs - new Date(state.started_at).getTime();
  return state.elapsed_ms ?? 0;
}

type Props = {
  state: TimerState | null;
  nowMs: number;
  variant?: "tv" | "console";
  className?: string;
};

/** Reloj presentacional: quien lo usa decide cómo avanza el tiempo. */
export function TimerDisplay({ state, nowMs, variant = "console", className }: Props) {
  if (!state) {
    return (
      <p className={className} aria-live="off">
        Sin cronómetro
      </p>
    );
  }

  const ms = timerMilliseconds(state, nowMs);
  const overtime = state.mode === "countdown" && ms < 0;
  const display = overtime ? `+${formatDuration(Math.abs(ms))}` : formatDuration(ms);

  const stateColor = overtime
    ? "text-sanction"
    : state.running
      ? variant === "tv"
        ? "text-white"
        : "text-ink"
      : "text-muted";

  const size =
    variant === "tv"
      ? "text-[clamp(4.5rem,25vw,20rem)]"
      : "text-[clamp(2.75rem,9vw,5rem)]";

  return (
    <div className={className}>
      <time
        className={`clock block ${size} ${stateColor}`}
        aria-label={`Tiempo ${display}`}
        aria-live="off"
      >
        {display}
      </time>
    </div>
  );
}
