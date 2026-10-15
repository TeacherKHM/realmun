import Link from "next/link";
import { timerCommand } from "@/app/actions/timer";
import { LiveTimer } from "@/components/LiveTimer";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, PageHeader, Panel, Stat } from "@/components/ui";
import { requireCommittee } from "@/lib/auth";
import {
  getAttendanceMap,
  getRubricMap,
  getTimerState,
  listDelegates,
  listResolutions,
  listSanctions,
  listSessions,
} from "@/lib/data";
import { formatScore, pluralize } from "@/lib/format";
import { SANCTION_LABELS, SANCTION_ORDER, rubricAverage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ params }: PageProps<"/comite/[code]">) {
  const { code } = await params;
  const { committee } = await requireCommittee(code);

  const [sessions, delegates] = await Promise.all([
    listSessions(committee.id),
    listDelegates(committee.id, true),
  ]);

  const active = sessions.find((item) => item.id === committee.active_session_id) ?? null;

  if (!active) {
    return (
      <>
        <PageHeader
          title="Resumen del comité"
          description="Cuando exista una sesión activa aquí verás la asistencia, las sanciones, las hojas y las evaluaciones del día."
        />
        <Empty>
          Todavía no hay sesiones.{" "}
          <Link
            href={`/comite/${committee.code}/sesiones`}
            className="underline decoration-line underline-offset-4"
          >
            Crea la primera sesión
          </Link>{" "}
          para empezar a registrar.
        </Empty>
      </>
    );
  }

  const [attendance, sanctions, resolutions, rubric, timer] = await Promise.all([
    getAttendanceMap(active.id),
    listSanctions(committee.id, active.id),
    listResolutions(committee.id, active.id),
    getRubricMap(active.id),
    getTimerState(committee.id),
  ]);

  const statusCount = (status: string) =>
    delegates.filter((delegate) => attendance[delegate.id]?.status === status).length;

  const sinRegistro = delegates.filter((delegate) => !attendance[delegate.id]);
  const evaluations = delegates.map((delegate) => rubric[delegate.id]).filter(Boolean);
  const generalAverage =
    evaluations.length > 0
      ? Math.round(
          (evaluations.reduce((sum, row) => sum + (rubricAverage(row.scores) ?? 0), 0) /
            evaluations.length) *
            10,
        ) / 10
      : null;

  const sinHojas = delegates.filter(
    (delegate) => !resolutions.some((row) => row.delegate_id === delegate.id),
  );

  const serverNow = new Date().toISOString();

  return (
    <>
      <PageHeader
        title="Resumen del comité"
        description={`${active.title} · ${delegates.length} delegados activos en este comité.`}
        actions={
          <>
            <Link href={`/comite/${committee.code}/asistencia`} className="btn btn-quiet">
              Tomar asistencia
            </Link>
            <Link href={`/comite/${committee.code}/cronometro`} className="btn btn-primary">
              Control del cronómetro
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Cronómetro de la sesión"
          description={timer?.label ? `Programa actual: ${timer.label}` : "Sin programa asignado"}
          actions={
            <Link
              href={`/comite/${committee.code}/cronometro`}
              className="text-sm text-muted underline decoration-line underline-offset-4"
            >
              Ajustes
            </Link>
          }
        >
          <LiveTimer state={timer} serverNow={serverNow} variant="console" />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <form action={timerCommand}>
              <input type="hidden" name="intent" value="start" />
              <input type="hidden" name="mode" value="countdown" />
              <input type="hidden" name="seconds" value={60} />
              <input type="hidden" name="label" value="Discurso" />
              <SubmitButton className="btn btn-quiet" pendingText="…">
                1:00
              </SubmitButton>
            </form>
            <form action={timerCommand}>
              <input type="hidden" name="intent" value="start" />
              <input type="hidden" name="mode" value="countdown" />
              <input type="hidden" name="seconds" value={120} />
              <input type="hidden" name="label" value="Moderado" />
              <SubmitButton className="btn btn-quiet" pendingText="…">
                2:00
              </SubmitButton>
            </form>
            <form action={timerCommand}>
              <input type="hidden" name="intent" value="start" />
              <input type="hidden" name="mode" value="countdown" />
              <input type="hidden" name="seconds" value={300} />
              <input type="hidden" name="label" value="Caucus" />
              <SubmitButton className="btn btn-quiet" pendingText="…">
                5:00
              </SubmitButton>
            </form>

            {timer?.running ? (
              <form action={timerCommand}>
                <input type="hidden" name="intent" value="pause" />
                <SubmitButton className="btn btn-primary" pendingText="…">
                  Pausar
                </SubmitButton>
              </form>
            ) : (
              <form action={timerCommand}>
                <input type="hidden" name="intent" value="resume" />
                <SubmitButton className="btn btn-primary" pendingText="…">
                  Reanudar
                </SubmitButton>
              </form>
            )}

            <form action={timerCommand}>
              <input type="hidden" name="intent" value="reset" />
              <SubmitButton className="btn btn-quiet" pendingText="…">
                Reiniciar
              </SubmitButton>
            </form>
          </div>

          <p className="mt-4 text-xs text-muted">
            Orador: {timer?.speaker ?? "sin asignar"}. Los cambios se reflejan en la pantalla de TV.
          </p>
        </Panel>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Presentes" value={statusCount("presente")} tone="ok" />
            <Stat label="Retardo" value={statusCount("retardo")} tone="gold" />
            <Stat label="Justificados" value={statusCount("justificado")} />
            <Stat label="Ausentes" value={statusCount("ausente")} tone="sanction" />
          </div>

          <Panel
            title="Sanciones de la sesión"
            description={pluralize(sanctions.length, "registro", "registros")}
            actions={
              <Link
                href={`/comite/${committee.code}/sanciones`}
                className="text-sm text-muted underline decoration-line underline-offset-4"
              >
                Registrar
              </Link>
            }
          >
            <div className="grid grid-cols-3 gap-3">
              {SANCTION_ORDER.map((type) => {
                const total = sanctions.filter((row) => row.type === type).length;
                return (
                  <Stat
                    key={type}
                    label={SANCTION_LABELS[type]}
                    value={total}
                    tone={total > 0 ? "sanction" : "default"}
                  />
                );
              })}
            </div>
            {sinRegistro.length > 0 ? (
              <p className="mt-4 text-xs text-muted">
                Sin asistencia registrada: {sinRegistro.map((d) => d.name).join(", ")}
              </p>
            ) : (
              <p className="mt-4 text-xs text-muted">Asistencia completa para esta sesión.</p>
            )}
          </Panel>

          <div className="grid gap-5 sm:grid-cols-2">
            <Panel
              title="Hojas de resolución"
              description={`${resolutions.length} recibidas`}
              actions={
                <Link
                  href={`/comite/${committee.code}/hojas`}
                  className="text-sm text-muted underline decoration-line underline-offset-4"
                >
                  Registrar
                </Link>
              }
            >
              <p className="font-clock text-4xl">{resolutions.length}</p>
              <p className="mt-2 text-xs text-muted">
                {sinHojas.length > 0
                  ? `Faltan ${pluralize(sinHojas.length, "delegado", "delegados")} por entregar.`
                  : "Todos los delegados entregaron al menos una hoja."}
              </p>
            </Panel>

            <Panel
              title="Rúbrica"
              description={`${evaluations.length} de ${delegates.length} evaluados`}
              actions={
                <Link
                  href={`/comite/${committee.code}/rubrica`}
                  className="text-sm text-muted underline decoration-line underline-offset-4"
                >
                  Evaluar
                </Link>
              }
            >
              <p className="font-clock text-4xl">{formatScore(generalAverage)}</p>
              <p className="mt-2 text-xs text-muted">Promedio general del comité en esta sesión.</p>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
