import { clearAttendance, markAllPresent, setAttendance } from "@/app/actions/attendance";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel } from "@/components/ui";
import { getAttendanceMap, listDelegates, resolveConsole } from "@/lib/data";
import { ATTENDANCE_LABELS, ATTENDANCE_ORDER, type AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const BUTTON_STYLE: Record<AttendanceStatus, string> = {
  presente: "btn border-ok/40 text-ok hover:bg-ok hover:text-white",
  retardo: "btn border-gold/50 text-gold hover:bg-gold hover:text-white",
  justificado: "btn border-edge text-ink hover:border-ink",
  ausente: "btn border-sanction/40 text-sanction hover:bg-sanction hover:text-white",
};

/** Estado ya elegido: el botón se rellena en vez de solo marcar el borde. */
const ACTIVE_STYLE: Record<AttendanceStatus, string> = {
  presente: "bg-ok text-white border-ok",
  retardo: "bg-gold text-white border-gold",
  justificado: "bg-ink text-white border-ink",
  ausente: "bg-sanction text-white border-sanction",
};

export default async function AttendancePage({ params }: PageProps<"/comite/[code]/asistencia">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  return (
    <>
      <PageHeader
        title="Asistencia"
        description={
          session
            ? `Registro de ${session.title}. Cada cambio se guarda al instante y se refleja en la pantalla de TV.`
            : "Aquí se toma asistencia de cada delegado en la sesión activa."
        }
        actions={
          session ? (
            <>
              <form action={markAllPresent.bind(null, committee.code)}>
                <input type="hidden" name="session_id" value={session.id} />
                <SubmitButton className="btn btn-quiet" pendingText="Marcando…">
                  Marcar presentes a quienes faltan
                </SubmitButton>
              </form>
              <form action={clearAttendance.bind(null, committee.code)}>
                <input type="hidden" name="session_id" value={session.id} />
                <ConfirmSubmitButton
                  className="btn btn-danger"
                  pendingText="Limpiando…"
                  confirmMessage={`¿Limpiar toda la asistencia de ${session.title}? Los estados registrados se pierden.`}
                >
                  Limpiar registro
                </ConfirmSubmitButton>
              </form>
            </>
          ) : null
        }
      />

      {!session ? <NoSession code={committee.code} /> : <AttendanceList committeeId={committee.id} committeeCode={committee.code} sessionId={session.id} />}
    </>
  );
}

async function AttendanceList({
  committeeId,
  committeeCode,
  sessionId,
}: {
  committeeId: string;
  committeeCode: string;
  sessionId: string;
}) {
  const [delegates, attendance] = await Promise.all([
    listDelegates(committeeId, true),
    getAttendanceMap(sessionId),
  ]);

  if (delegates.length === 0) {
    return (
      <Empty>
        Este comité todavía no tiene delegados. Agrégalos en la sección Delegados.
      </Empty>
    );
  }

  const pendientes = delegates.filter((delegate) => !attendance[delegate.id]).length;

  return (
    <Panel
      title={`Lista de asistencia · ${delegates.length} delegados`}
      description={
        pendientes > 0
          ? `Faltan ${pendientes} por registrar.`
          : "Todos los delegados tienen estado registrado."
      }
    >
      <p className="sr-only" role="status" aria-live="polite">
        {delegates.length - pendientes} de {delegates.length} delegados registrados.
      </p>
      <ul className="space-y-2">
        {delegates.map((delegate) => {
          const current = attendance[delegate.id]?.status;

          return (
            <li
              key={delegate.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1 basis-[12rem]">
                <p className="break-words font-semibold">{delegate.name}</p>
                <p className="text-xs text-muted">
                  {delegate.delegation ?? "Sin delegación asignada"}
                  {current ? ` · ${ATTENDANCE_LABELS[current]}` : " · sin registrar"}
                </p>
              </div>

              <form action={setAttendance.bind(null, committeeCode)} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="session_id" value={sessionId} />
                <input type="hidden" name="delegate_id" value={delegate.id} />
                {ATTENDANCE_ORDER.map((status) => {
                  const active = current === status;
                  return (
                    <SubmitButton
                      key={status}
                      name="status"
                      value={status}
                      ariaPressed={active}
                      className={`${BUTTON_STYLE[status]} ${active ? ACTIVE_STYLE[status] : ""}`}
                      pendingText="…"
                    >
                      {ATTENDANCE_LABELS[status]}
                    </SubmitButton>
                  );
                })}
              </form>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
