import Link from "next/link";
import {
  createSession,
  deleteSession,
  setActiveSession,
  updateSessionStatus,
} from "@/app/actions/sessions";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { resolveConsole } from "@/lib/data";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SessionsPage({ params }: PageProps<"/comite/[code]/sesiones">) {
  const { code } = await params;
  const { committee, sessions } = await resolveConsole(code);

  return (
    <>
      <PageHeader
        title="Sesiones"
        description="Cada sesión guarda su propia asistencia, sanciones, hojas y rúbrica. La sesión activa es la que se ve en la consola y en la TV."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Nueva sesión" description="La fecha es la del día en que se celebra.">
          <form action={createSession} className="space-y-4">
            <div>
              <label className="label" htmlFor="title">
                Nombre
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={`Sesión ${sessions.length + 1}`}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="session_date">
                Fecha
              </label>
              <input
                id="session_date"
                name="session_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="field w-48"
              />
            </div>
            <SubmitButton pendingText="Creando…">Crear y activar</SubmitButton>
          </form>
        </Panel>

        <Panel title="Historial de sesiones" description={`${sessions.length} sesiones registradas.`}>
          {sessions.length === 0 ? (
            <Empty>Aún no hay sesiones en este comité.</Empty>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => {
                const isActive = session.id === committee.active_session_id;
                return (
                  <li
                    key={session.id}
                    className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${
                      isActive ? "border-flag bg-white" : "border-line bg-paper-warm"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">
                        {session.title}
                        {isActive ? (
                          <span className="ml-2 border border-flag/50 px-2 py-0.5 text-xs text-plenary">
                            en curso
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        {formatShortDate(session.session_date)} ·{" "}
                        {session.status === "activa" ? "activa" : "finalizada"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isActive ? (
                        <form action={setActiveSession}>
                          <input type="hidden" name="session_id" value={session.id} />
                          <SubmitButton className="btn btn-quiet" pendingText="…">
                            Activar
                          </SubmitButton>
                        </form>
                      ) : (
                        <Link
                          href={`/comite/${committee.code}/asistencia`}
                          className="btn btn-quiet"
                        >
                          Tomar asistencia
                        </Link>
                      )}

                      <form action={updateSessionStatus}>
                        <input type="hidden" name="session_id" value={session.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={session.status === "activa" ? "finalizada" : "activa"}
                        />
                        <SubmitButton className="btn btn-quiet" pendingText="…">
                          {session.status === "activa" ? "Finalizar" : "Reabrir"}
                        </SubmitButton>
                      </form>

                      <form action={deleteSession}>
                        <input type="hidden" name="session_id" value={session.id} />
                        <SubmitButton className="btn btn-danger" pendingText="…">
                          Eliminar
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-xs text-muted">
            Eliminar una sesión borra también su asistencia, sanciones, hojas y evaluaciones.
          </p>
        </Panel>
      </div>
    </>
  );
}
