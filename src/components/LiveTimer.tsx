"use client";

import { useEffect, useState } from "react";
import { TimerDisplay } from "@/components/TimerDisplay";
import type { TimerState } from "@/lib/types";

type Props = {
  state: TimerState | null;
  serverNow: string;
  variant?: "tv" | "console";
  compact?: boolean;
  className?: string;
};

/**
 * Reloj vivo: avanza en el navegador a partir de `serverNow` para que la consola
 * y la pantalla de TV coincidan aunque la red tarde.
 */
export function LiveTimer({
  state,
  serverNow,
  variant = "console",
  compact = false,
  className,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const offset = Date.parse(serverNow) - Date.now();
    const id = window.setInterval(() => setNowMs(Date.now() + offset), 200);
    return () => window.clearInterval(id);
  }, [serverNow]);

  return (
    <TimerDisplay
      state={state}
      nowMs={nowMs}
      variant={variant}
      compact={compact}
      className={className}
    />
  );
}
