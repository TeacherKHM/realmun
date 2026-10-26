import { addSanction, deleteSanction } from "@/app/actions/sanctions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel, Stat } from "@/components/ui";
import { listDelegates, listSanctions, resolveConsole } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import {
  SANCTION_LABELS,
  SANCTION_ORDER,
  SANCTION_POINTS,
  SANCTION_RULES,
  type SanctionType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<SanctionType, string> = {
  amonestacion: "border-gold/50 text-gold",
  advertencia: "border-sanction/40 text-sanction",
  disciplina: "border-sanction bg-sanction text-white",
  expulsion_sesion: "border-ink bg-ink text-white",
  expulsion_dia: "border-ink bg-ink text-white",
  expulsion_mun: "border-ink bg-ink text-white",
};

const PHONE_REASON = "Uso de celular o iPad personal";

export default async function SanctionsPage({ params }: PageProps<"/comite/[code]/sanciones">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <PageHeader title="Sanciones" description="Amonestaciones, advertencias, disciplina y expulsiones (por sesión, por día o del MUN)." />
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, sanctions] = await Promise.all([
    listDelegates(committee.id),
    listSanctions(committee.id),
  ]);

  const activeDelegates = delegates.filter((delegate) => delegate.active);
  const nameOf = (delegateId: string) =>
    delegates.find((delegate) => delegate.id === delegateId)?.name ?? "Delegado eliminado";

  const sessionSanctions = sanctions.filter((row) => row.session_id === session.id);

  const summary = delegates
    .map((delegate) => {
      const rows = sanctions.filter((row) => row.delegate_id === delegate.id);
      const count = (type: SanctionType) => rows.filter((row) => row.type === type).length;
      const expulsions = rows.filter((row) => row.type.startsWith("expulsion")).length;
      return {
        delegate,
        warnings: count("advertencia"),
        reprimands: count("amonestacion"),
        expulsions,
        points: rows.reduce((sum, row) => sum + row.points, 0),
      };
    })
    .filter((row) => row.delegate.active || row.points > 0)
    .sort(
      (a, b) =>
        Number(b.delegate.active) - Number(a.delegate.active) ||
        b.points - a.points ||
        a.delegate.name.localeCompare(b.delegate.name),
    );

  return (
    <>
      <PageHeader
        title="Sanciones"
        description={`Reglas: ${SANCTION_RULES.warningsPerReprimand} advertencias → 1 amonestación · ${SANCTION_RULES.reprimandsToExpel} amonestaciones → fuera del comité. Puntos acumulados por delegado en todo el comité.`}
      />

      {delegates.length === 0 ? (
        <Empty>Agrega delegados antes de registrar sanciones.</Empty>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
          <div className="space-y-5">
            <Panel title="Nueva sanción" description={`Se registra en ${session.title}.`}>
              {activeDelegates.length === 0 ? (
                <Empty>No hay delegados activos en el comité.</Empty>
              ) : (
                <form action={addSanction.bind(null, committee.code)} className="space-y-4">
                  <input type="hidden" name="session_id" value={session.id} />

                  <div>
                    <label className="label" htmlFor="delegate_id">
                      Delegado
                    </label>
                    <select id="delegate_id" name="delegate_id" required className="field">
                      {activeDelegates.map((delegate) => (
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
                          {SANCTION_LABELS[type]} (−{SANCTION_POINTS[type]} pts)
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
              )}

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5 sm:grid-cols-3 xl:grid-cols-6">
                {SANCTION_ORDER.map((type) => {
                  const total = sessionSanctions.filter((row) => row.type === type).length;
                  return (
                    <Stat
                      key={type}
                      label={SANCTION_LABELS[type]}
                      value={total}
                      tone={total > 0 && type.startsWith("expulsion") ? "sanction" : total > 0 ? "sanction" : "default"}
                    />
                  );
                })}
              </div>
            </Panel>

            {activeDelegates.length > 0 ? (
              <Panel
                title="Sanción rápida: celular / iPad"
                description="Registra una amonestación con motivo fijo y aplica el escalamiento normal."
              >
                <form action={addSanction.bind(null, committee.code)} className="space-y-4">
                  <input type="hidden" name="session_id" value={session.id} />
                  <input type="hidden" name="type" value="amonestacion" />
                  <input type="hidden" name="reason" value={PHONE_REASON} />

                  <div>
                    <label className="label" htmlFor="quick_delegate_id">
                      Delegado
                    </label>
                    <select id="quick_delegate_id" name="delegate_id" required className="field">
                      {activeDelegates.map((delegate) => (
                        <option key={delegate.id} value={delegate.id}>
                          {delegate.name}
                          {delegate.delegation ? ` · ${delegate.delegation}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-muted">
                    Motivo: «{PHONE_REASON}» · {SANCTION_LABELS.amonestacion} (−
                    {SANCTION_POINTS.amonestacion} pts)
                  </p>

                  <SubmitButton pendingText="Registrando…">
                    Registrar amonestación por celular/iPad
                  </SubmitButton>
                </form>
              </Panel>
            ) : null}

            <Panel title="Puntos por sanción" description="Se acumulan por delegado en todo el comité.">
              <ul className="grid gap-2 sm:grid-cols-2">
                {(["advertencia", "amonestacion", "expulsion_sesion", "expulsion_dia", "expulsion_mun"] as const).map(
                  (type) => (
                    <li
                      key={type}
                      className="flex items-center justify-between gap-3 rounded-control border border-line-soft bg-paper px-3 py-2 text-sm"
                    >
                      <span>{SANCTION_LABELS[type]}</span>
                      <span className="font-clock tabular-nums">−{SANCTION_POINTS[type]}</span>
                    </li>
                  ),
                )}
              </ul>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel
              title="Disciplina por delegado"
              description={`${delegates.length} registrados · ${activeDelegates.length} activos. Las reglas se acumulan entre sesiones.`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="border-b border-line text-xs text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Delegado
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Advertencias
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Amonestaciones
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Expulsiones
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Puntos
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {summary.map((row) => (
                      <tr key={row.delegate.id}>
                        <th scope="row" className="max-w-[14rem] break-words py-2 pr-3 font-normal">
                          {row.delegate.name}
                          {row.delegate.delegation ? (
                            <span className="text-muted"> · {row.delegate.delegation}</span>
                          ) : null}
                        </th>
                        <td className="py-2 pr-3 text-right font-clock tabular-nums">
                          {row.warnings}/{SANCTION_RULES.warningsPerReprimand}
                        </td>
                        <td className="py-2 pr-3 text-right font-clock tabular-nums">
                          {row.reprimands}/{SANCTION_RULES.reprimandsToExpel}
                        </td>
                        <td className="py-2 pr-3 text-right font-clock tabular-nums">{row.expulsions}</td>
                        <td className="py-2 pr-3 text-right font-clock tabular-nums">
                          {row.points > 0 ? `−${row.points}` : "0"}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`rounded-chip border px-2 py-0.5 text-xs ${
                              row.delegate.active
                                ? "border-ok/40 text-ok"
                                : "border-sanction/40 text-sanction"
                            }`}
                          >
                            {row.delegate.active ? "En el comité" : "Fuera del comité"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        <p className="mt-1 text-xs text-muted">
                          {formatDateTime(row.created_at)} · −{row.points} pts
                          {row.automatic ? " · automática" : ""}
                        </p>
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
                          <span className="text-muted">
                            {formatDateTime(row.created_at)} · −{row.points} pts
                            {row.automatic ? " · automática" : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </details>
              ) : null}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
