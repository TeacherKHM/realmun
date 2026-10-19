import Link from "next/link";
import { timerCommand } from "@/app/actions/timer";
import { LiveTimer } from "@/components/LiveTimer";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Panel } from "@/components/ui";
import { getTimerState, resolveConsole } from "@/lib/data";
import { TIMER_PRESETS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TimerPage({ params }: PageProps<"/comite/[code]/cronometro">) {
  const { code } = await params;
  const { committee } = await resolveConsole(code);
  const timer = await getTimerState(committee.id);
  const serverNow = new Date().toISOString();

  return (
    <>
      <PageHeader
        title="Cronómetro"
        description="El tiempo corre igual en esta pantalla y en la televisión del comité. Los presets activan la cuenta de inmediato."
        actions={
          <Link href={`/vista-tv/${committee.code}`} target="_blank" className="btn btn-quiet" rel="noopener noreferrer">
            Ver pantalla de TV
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Tiempo en pantalla"
          description={timer ? `${timer.label ?? "Sin programa"} · ${timer.speaker ?? "sin orador"}` : "Sin estado"}
        >
          <div className="rounded-card bg-ink px-6 py-8 text-center">
            <LiveTimer state={timer} serverNow={serverNow} variant="console" className="text-white" />
            <p className="mt-4 text-sm text-white/55">
              {timer?.running ? "Corriendo" : "En pausa"}
              {timer?.mode === "countup" ? " · tiempo transcurrido" : " · cuenta regresiva"}
            </p>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Presets" description="Un clic para arrancar el programa.">
            <div className="grid grid-cols-2 gap-2">
              {TIMER_PRESETS.map((preset) => (
                <form action={timerCommand.bind(null, committee.code)} key={preset.label}>
                  <input type="hidden" name="intent" value="start" />
                  <input type="hidden" name="mode" value="countdown" />
                  <input type="hidden" name="seconds" value={preset.seconds} />
                  <input type="hidden" name="label" value={preset.label} />
                  <SubmitButton className="btn btn-quiet w-full" pendingText="…">
                    {preset.label} · {Math.floor(preset.seconds / 60)} min
                  </SubmitButton>
                </form>
              ))}
            </div>

            <form action={timerCommand.bind(null, committee.code)} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="intent" value="start" />
              <input type="hidden" name="mode" value="countdown" />
              <div>
                <label className="label" htmlFor="minutes">
                  Tiempo a la medida (minutos)
                </label>
                <input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  max={120}
                  defaultValue={3}
                  className="field w-28"
                />
              </div>
              <div className="flex-1">
                <label className="label" htmlFor="label">
                  Etiqueta
                </label>
                <input id="label" name="label" type="text" placeholder="Debate libre" className="field" />
              </div>
              <SubmitButton pendingText="…">Arrancar</SubmitButton>
            </form>
          </Panel>

          <Panel title="Control en vivo">
            <div className="flex flex-wrap gap-2">
              {timer?.running ? (
                <form action={timerCommand.bind(null, committee.code)}>
                  <input type="hidden" name="intent" value="pause" />
                  <SubmitButton className="btn btn-primary" pendingText="…">
                    Pausar
                  </SubmitButton>
                </form>
              ) : (
                <form action={timerCommand.bind(null, committee.code)}>
                  <input type="hidden" name="intent" value="resume" />
                  <SubmitButton className="btn btn-primary" pendingText="…">
                    Reanudar
                  </SubmitButton>
                </form>
              )}

              <form action={timerCommand.bind(null, committee.code)}>
                <input type="hidden" name="intent" value="reset" />
                <SubmitButton className="btn btn-quiet" pendingText="…">
                  Reiniciar a cero
                </SubmitButton>
              </form>

              <form action={timerCommand.bind(null, committee.code)}>
                <input type="hidden" name="intent" value="mode" />
                <input type="hidden" name="mode" value="countup" />
                <SubmitButton className="btn btn-quiet" pendingText="…">
                  Modo transcurrido
                </SubmitButton>
              </form>

              <form action={timerCommand.bind(null, committee.code)}>
                <input type="hidden" name="intent" value="mode" />
                <input type="hidden" name="mode" value="countdown" />
                <SubmitButton className="btn btn-quiet" pendingText="…">
                  Modo regresivo
                </SubmitButton>
              </form>
            </div>

            <form action={timerCommand.bind(null, committee.code)} className="mt-5 flex flex-wrap items-end gap-2">
              <input type="hidden" name="intent" value="speaker" />
              <div className="flex-1">
                <label className="label" htmlFor="speaker">
                  Orador en el atril
                </label>
                <input
                  id="speaker"
                  name="speaker"
                  type="text"
                  defaultValue={timer?.speaker ?? ""}
                  placeholder="Delegación de México"
                  className="field"
                />
              </div>
              <SubmitButton className="btn btn-quiet" pendingText="…">
                Guardar orador
              </SubmitButton>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
