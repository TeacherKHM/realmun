import Link from "next/link";
import { RubricEditor } from "@/components/RubricEditor";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { requireDireccion } from "@/lib/auth";
import { getRubricMap, listCommittees, listDelegates, listSessions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PanelRubricPage({
  searchParams,
}: PageProps<"/panel/rubrica">) {
  await requireDireccion();
  const params = await searchParams;

  const committees = await listCommittees();
  if (committees.length === 0) {
    return (
      <>
        <PageHeader title="Rúbrica del presidente" description="Evalúa a los delegados de cualquier comité desde el panel." />
        <Empty>Todavía no hay comités registrados en la base de datos.</Empty>
      </>
    );
  }

  const selectedCommittee =
    committees.find((committee) => committee.code === params.comite) ?? committees[0];
  const sessions = await listSessions(selectedCommittee.id);
  const selectedSession =
    sessions.find((session) => session.id === params.sesion) ??
    sessions.find((session) => session.id === selectedCommittee.active_session_id) ??
    sessions[0] ??
    null;

  const [delegates, rubric] = selectedSession
    ? await Promise.all([
        listDelegates(selectedCommittee.id, true),
        getRubricMap(selectedSession.id),
      ])
    : [[], {}];

  return (
    <>
      <PageHeader
        title="Rúbrica del presidente"
        description="La misma rúbrica de la consola, sin entrar comité por comité. Elige comité y sesión; lo que guardes se refleja en su consola y en la radiografía."
        actions={
          <Link
            href={`/panel/comites#comite-${selectedCommittee.code}`}
            className="btn btn-quiet"
          >
            Editar criterios
          </Link>
        }
      />

      <Panel
        title="Comité y sesión"
        description="Al cambiar de comité se usa su sesión activa; después puedes elegir otra sesión."
        className="mb-5"
      >
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label className="label" htmlFor="comite">
              Comité
            </label>
            <select id="comite" name="comite" defaultValue={selectedCommittee.code} className="field">
              {committees.map((committee) => (
                <option key={committee.id} value={committee.code}>
                  {committee.sigla} · {committee.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[14rem] flex-1">
            <label className="label" htmlFor="sesion">
              Sesión
            </label>
            <select
              id="sesion"
              name="sesion"
              defaultValue={selectedSession?.id ?? ""}
              className="field"
              disabled={sessions.length === 0}
            >
              {sessions.length === 0 ? (
                <option value="">Sin sesiones registradas</option>
              ) : (
                sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                    {session.status === "activa" ? " · activa" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={sessions.length === 0}>
            Ver rúbrica
          </button>
        </form>
      </Panel>

      {!selectedSession ? (
        <Empty>
          Este comité no tiene sesiones.{" "}
          <Link href={`/comite/${selectedCommittee.code}/sesiones`} className="link">
            Crea una sesión en su consola
          </Link>{" "}
          para poder evaluar.
        </Empty>
      ) : delegates.length === 0 ? (
        <Empty>
          El comité no tiene delegados activos.{" "}
          <Link href={`/comite/${selectedCommittee.code}/delegados`} className="link">
            Agrégalos en su consola
          </Link>
          .
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ background: selectedCommittee.accent }}
            />
            <span className="font-semibold text-ink">{selectedCommittee.sigla}</span>
            <span>{selectedCommittee.name}</span>
            <span>· {selectedSession.title}</span>
            <span>· {delegates.length} delegados activos</span>
          </div>

          <RubricEditor
            committee={selectedCommittee}
            session={selectedSession}
            delegates={delegates}
            rubric={rubric}
          />
        </>
      )}
    </>
  );
}
