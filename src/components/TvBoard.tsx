"use client";

import { useEffect, useState } from "react";
import { LiveTimer } from "@/components/LiveTimer";
import { SANCTION_LABELS, SANCTION_ORDER, type SanctionType, type TimerState } from "@/lib/types";

export type TvPayload = {
  now: string;
  committee: { code: string; sigla: string; name: string; topic: string | null; accent: string } | null;
  session: { id: string; title: string; date: string; status: string } | null;
  delegates_total: number;
  presence: Partial<Record<"presente" | "ausente" | "justificado" | "retardo", number>>;
  sanctions: Partial<Record<SanctionType, number>>;
  resolutions: number;
  timer: TimerState | null;
};

const MODE_LABELS: Record<TimerState["mode"], string> = {
  countdown: "Cuenta regresiva",
  countup: "Tiempo transcurrido",
};

export function TvBoard({ code, initial }: { code: string; initial: TvPayload }) {
  const [data, setData] = useState<TvPayload>(initial);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(`/api/tv/${code}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as TvPayload;
        if (active) setData(payload);
      } catch {
        // Sin red: se mantiene el último estado y el reloj sigue local.
      }
    }

    const id = window.setInterval(load, 1000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [code]);

  const { committee, session, timer } = data;
  const presentes = data.presence.presente ?? 0;
  const total = data.delegates_total;

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-white">
      <div aria-hidden className="h-2" style={{ background: committee?.accent ?? "#4B92DB" }} />

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-8 pt-7 pb-5 sm:px-12">
        <div>
          <p className="font-display text-5xl leading-none sm:text-6xl">
            {committee?.sigla ?? "Comité"}
          </p>
          <p className="mt-2 text-base text-white/70">
            {committee?.name}
            {committee?.topic ? ` · ${committee.topic}` : ""}
          </p>
        </div>
        <div className="text-right text-sm text-white/60">
          <p>{session ? session.title : "Sin sesión activa"}</p>
          <p className="mt-1">{presentes} de {total} delegados en sala</p>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-8 sm:px-12">
        <LiveTimer
          state={timer}
          serverNow={data.now}
          variant="tv"
          className="w-full text-center"
        />
        <p className="mt-6 text-center text-lg text-white/80">
          {timer?.speaker ? `Orador: ${timer.speaker}` : "Sin orador en el atril"}
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/55">
          <span>{timer ? MODE_LABELS[timer.mode] : "Cronómetro sin configurar"}</span>
          {timer?.label ? <span>{timer.label}</span> : null}
          <span>{timer?.running ? "En curso" : "En pausa"}</span>
        </p>
      </section>

      <footer className="border-t border-white/12 px-8 py-6 sm:px-12">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {SANCTION_ORDER.map((type) => (
            <div key={type}>
              <dt className="text-xs text-white/55">{SANCTION_LABELS[type]}s</dt>
              <dd className="font-clock mt-1 text-4xl">{data.sanctions[type] ?? 0}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-white/55">Hojas recibidas</dt>
            <dd className="font-clock mt-1 text-4xl">{data.resolutions}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/55">Ausentes</dt>
            <dd className="font-clock mt-1 text-4xl">{data.presence.ausente ?? 0}</dd>
          </div>
        </dl>
      </footer>
    </main>
  );
}
