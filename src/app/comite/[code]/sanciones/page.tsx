import { addSanction, deleteSanction } from "@/app/actions/sanctions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel, Stat } from "@/components/ui";
import { listDelegates, listSanctions, resolveConsole } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { SANCTION_LABELS, SANCTION_ORDER, type SanctionType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<SanctionType, string> = {
  amonestacion: "border-gold/50 text-gold",
  advertencia: "border-sanction/40 text-sanction",
  disciplina: "border-sanction bg-sanction text-white",
};

export default async function SanctionsPage({ params }: PageProps<"/comite/[code]/sanciones">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <PageHeader title="Sanciones" description="Amonestaciones, advertencias y disciplina." />
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, sanctions] = await Promise.all([
    listDelegates(committee.id, true),
    listSanctions(committee.id),
  ]);

  const nameOf = (delegateId: string) =>
    delegates.find((delegate) => delegate.id === delegateId)?.name ?? "Delegado eliminado";

  const sessionSanctions = sanctions.filter((row) => row.session_id === session.id);

  return (
    <>
      <PageHeader
        title="Sanciones"
        description="Cada registro guarda tipo, motivo y hora. El conteo de la sesión aparece en la pantalla de TV."
      />

      {delegates.length === 0 ? (
        <Empty>Agrega delegados antes de registrar sanciones.</Empty>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
          <Panel title="Nueva sanción" description={`Se registra en ${session.title}.`}>
            <form action={addSanction.bind(null, committee.code)} className="space-y-4">
              <input type="hidden" name="session_id" value={session.id} />

              <div>
                <label className="label" htmlFor="delegate_id">
                  Delegado
                </label>
                <select id="delegate_id" name="delegate_id" required className="field">
                  {delegates.map((delegate) => (
                    <option key={delegate.id} value={delegate.id}>
                      {delegate.name}
                      {delegate.delegation ? ` · ${delegate.delegation}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="type">
                  Tipo
                </label>
                <select id="type" name="type" required className="field">
                  {SANCTION_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {SANCTION_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="reason">
                  Motivo
                </label>
                <input
                  id="reason"
                  name="reason"
                  type="text"
                  required
                  placeholder="Interrupción durante el discurso"
                  className="field"
                />
              </div>

              <SubmitButton pendingText="Registrando…">Registrar sanción</SubmitButton>
            </form>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line-soft pt-5">
              {SANCTION_ORDER.map((type) => {
                const total = sessionSanctions.filter((row) => row.type === type).length;
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
          </Panel>

          <Panel
            title="Historial de la sesión"
            description={`${sessionSanctions.length} registros en ${session.title}. El historial completo del comité aparece abajo.`}
          >
            {sessionSanctions.length === 0 ? (
              <Empty>Sin sanciones registradas en esta sesión.</Empty>
            ) : (
              <ul className="space-y-2">
                {sessionSanctions.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 basis-[14rem]">
                      <p className="break-words font-semibold">{nameOf(row.delegate_id)}</p>
                      <p className="break-words text-sm text-muted">{row.reason}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(row.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-chip border px-2 py-0.5 text-xs ${TYPE_STYLE[row.type]}`}>
                        {SANCTION_LABELS[row.type]}
                      </span>
                      <form action={deleteSanction.bind(null, committee.code)}>
                        <input type="hidden" name="sanction_id" value={row.id} />
                        <ConfirmSubmitButton
                          className="btn btn-danger"
                          pendingText="…"
                          confirmMessage={`¿Quitar la sanción de ${nameOf(row.delegate_id)} (${SANCTION_LABELS[row.type]})?`}
                        >
                          Quitar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {sanctions.length > sessionSanctions.length ? (
              <details className="mt-6 border-t border-line-soft pt-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Historial de otras sesiones ({sanctions.length - sessionSanctions.length})
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {sanctions
                    .filter((row) => row.session_id !== session.id)
                    .map((row) => (
                      <li key={row.id} className="rounded-control border border-line-soft bg-paper px-3 py-2">
                        <span className="font-semibold">{nameOf(row.delegate_id)}</span> ·{" "}
                        {SANCTION_LABELS[row.type]} · {row.reason} ·{" "}
                        <span className="text-muted">{formatDateTime(row.created_at)}</span>
                      </li>
                    ))}
                </ul>
              </details>
            ) : null}
          </Panel>
        </div>
      )}
    </>
  );
}
