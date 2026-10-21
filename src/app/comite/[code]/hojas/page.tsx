import Link from "next/link";

import { addResolution, deleteResolution } from "@/app/actions/resolutions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel, Stat } from "@/components/ui";
import { listDelegates, listResolutions, resolveConsole } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ResolutionsPage({ params }: PageProps<"/comite/[code]/hojas">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Hojas de resolución"
            description="Control de entrega de hojas de resolución por delegado."
          />
          <Link href={`/comite/${committee.code}/hojas/votaciones`} className="btn btn-primary mt-1">
            Votaciones por alianza
          </Link>
        </div>
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, resolutions] = await Promise.all([
    listDelegates(committee.id, true),
    listResolutions(committee.id),
  ]);

  const sessionResolutions = resolutions.filter((row) => row.session_id === session.id);
  const countFor = (delegateId: string) =>
    resolutions.filter((row) => row.delegate_id === delegateId).length;
  const entregaron = delegates.filter((delegate) => countFor(delegate.id) > 0).length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Hojas de resolución"
          description="Marca cada entrega: la versión se numera sola (v1, v2, v3…) y queda la hora del registro."
        />
        <Link href={`/comite/${committee.code}/hojas/votaciones`} className="btn btn-primary mt-1">
          Votaciones por alianza
        </Link>
      </div>

      {delegates.length === 0 ? (
        <Empty>Agrega delegados antes de registrar hojas de resolución.</Empty>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
          <Panel title="Registrar entrega" description={`Se asigna a ${session.title}.`}>
            <form action={addResolution.bind(null, committee.code)} className="space-y-4">
              <input type="hidden" name="session_id" value={session.id} />

              <div>
                <label className="label" htmlFor="delegate_id">
                  Delegado
                </label>
                <select id="delegate_id" name="delegate_id" required className="field">
                  {delegates.map((delegate) => (
                    <option key={delegate.id} value={delegate.id}>
                      {delegate.name}
                      {delegate.delegation ? ` · ${delegate.delegation}` : ""} ·{" "}
                      {countFor(delegate.id)} entregadas
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="notes">
                  Nota (opcional)
                </label>
                <input
                  id="notes"
                  name="notes"
                  type="text"
                  placeholder="Hojas de trabajo con 3 cláusulas"
                  className="field"
                />
              </div>

              <SubmitButton pendingText="Registrando…">Registrar hoja</SubmitButton>
            </form>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5">
              <Stat label="Hojas en esta sesión" value={sessionResolutions.length} />
              <Stat
                label="Delegados que entregaron"
                value={`${entregaron}/${delegates.length}`}
                tone={entregaron === delegates.length ? "ok" : "gold"}
              />
            </div>
          </Panel>

          <Panel
            title="Entregas registradas"
            description={`${sessionResolutions.length} en ${session.title} · ${resolutions.length} en todo el comité.`}
          >
            {sessionResolutions.length === 0 ? (
              <Empty>Sin hojas registradas en esta sesión.</Empty>
            ) : (
              <ul className="space-y-2">
                {sessionResolutions.map((row) => {
                  const delegate = delegates.find((item) => item.id === row.delegate_id);
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {delegate?.name ?? "Delegado eliminado"}{" "}
                          <span className="font-clock tabular-nums text-sm text-muted">v{row.version}</span>
                        </p>
                        <p className="break-words text-xs text-muted">
                          {formatDateTime(row.received_at)}
                          {row.notes ? ` · ${row.notes}` : ""}
                        </p>
                      </div>
                      <form action={deleteResolution.bind(null, committee.code)}>
                        <input type="hidden" name="resolution_id" value={row.id} />
                        <ConfirmSubmitButton
                          className="btn btn-danger"
                          pendingText="…"
                          confirmMessage={`¿Quitar la hoja v${row.version} de ${delegate?.name ?? "este delegado"}?`}
                        >
                          Quitar
                        </ConfirmSubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}

            <details className="mt-6 border-t border-line-soft pt-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Resumen por delegado
              </summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {delegates.map((delegate) => (
                  <li
                    key={delegate.id}
                    className="flex items-center justify-between rounded-control border border-line-soft bg-paper px-3 py-2 text-sm"
                  >
                    <span>{delegate.name}</span>
                    <span className="font-clock">{countFor(delegate.id)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </Panel>
        </div>
      )}
    </>
  );
}
