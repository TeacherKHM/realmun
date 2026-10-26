import { createResolutionGroup, deleteResolutionGroup, finalizeResolutionGroup, setResolutionVote } from "@/app/actions/votes";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel, Stat } from "@/components/ui";
import { listDelegates, listResolutionGroups, listResolutionVotes, resolveConsole } from "@/lib/data";
import { VOTE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VotingPage({
  params,
}: PageProps<"/comite/[code]/hojas/votaciones">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <PageHeader title="Votaciones por alianza" description="3 rondas: ronda 1 y 2 con a favor/en contra/abstención; ronda 3 solo a favor/en contra (definitiva)." />
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, groups, votes] = await Promise.all([
    listDelegates(committee.id, true),
    listResolutionGroups(committee.id, session.id),
    listResolutionVotes(committee.id, session.id),
  ]);

  const countVotes = (groupId: string, round: 1 | 2 | 3) => {
    const list = votes.filter((v) => v.resolution_group_id === groupId && v.round === round);
    const aFavor = list.filter((v) => v.vote === "a_favor").length;
    const enContra = list.filter((v) => v.vote === "en_contra").length;
    const abstencion = list.filter((v) => v.vote === "abstencion").length;
    const map = Object.fromEntries(list.map((v) => [v.delegate_id, v.vote]));
    return { total: list.length, aFavor, enContra, abstencion, map };
  };

  return (
    <>
      <PageHeader
        title="Votaciones por alianza"
        description="Registra alianzas, vota por delegado en cada ronda y obtén las estadísticas al finalizar."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Nueva alianza / proyecto de resolución" description={`Sesión: ${session.title}`}>
          <form action={createResolutionGroup.bind(null, committee.code)} className="space-y-4">
            <input type="hidden" name="session_id" value={session.id} />
            <div>
              <label className="label" htmlFor="name">Nombre de la alianza/resolución</label>
              <input id="name" name="name" required className="field" placeholder="Bloque X" />
            </div>
            <div>
              <label className="label" htmlFor="sponsors">Patrocinadores / firmantes (uno por línea o separados por coma)</label>
              <textarea id="sponsors" name="sponsors" rows={2} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="notes">Notas</label>
              <input id="notes" name="notes" className="field" />
            </div>
            <SubmitButton pendingText="Creando…">Crear alianza</SubmitButton>
          </form>
        </Panel>

        <Panel title="Alianzas en votación" description={`${groups.length} registradas`}>
          {groups.length === 0 ? (
            <Empty>Sin alianzas registradas.</Empty>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const r1 = countVotes(group.id, 1);
                const r2 = countVotes(group.id, 2);
                const r3 = countVotes(group.id, 3);
                const sponsors = Array.isArray(group.sponsors) ? group.sponsors : [];

                return (
                  <details key={group.id} className="rounded-card border border-line">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold">{group.name}</p>
                        <p className="text-xs text-muted">{sponsors.length > 0 ? sponsors.join(", ") : "Sin patrocinadores"}{group.status !== "presentado" ? ` · ${group.status === "aprobado" ? "Aprobado" : "Rechazado"}` : ""}</p>
                      </div>
                      <span className={`rounded-chip border px-2 py-0.5 text-xs ${group.status === "aprobado" ? "border-ok/40 text-ok" : group.status === "rechazado" ? "border-sanction/40 text-sanction" : "border-line text-muted"}`}>
                        {group.status === "presentado" ? "En votación" : group.status === "aprobado" ? "Aprobado" : "Rechazado"}
                      </span>
                    </summary>
                    <div className="space-y-5 border-t border-line-soft px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Stat label="Ronda 1 (a favor/en contra/abstención)" value={`${r1.aFavor}/${r1.enContra}/${r1.abstencion} (${r1.total})`} />
                        <Stat label="Ronda 2 (a favor/en contra/abstención)" value={`${r2.aFavor}/${r2.enContra}/${r2.abstencion} (${r2.total})`} />
                        <Stat label="Ronda 3 (DEFINITIVA - a favor/en contra)" value={`${r3.aFavor}/${r3.enContra} (${r3.total})`} tone={r3.total > 0 ? "gold" : "default"} />
                      </div>

                      {([1, 2, 3] as const).map((round) => {
                        const c = round === 1 ? r1 : round === 2 ? r2 : r3;
                        const isFinal = round === 3;
                        const options = round === 3 ? (["a_favor", "en_contra"] as const) : (["a_favor", "en_contra", "abstencion"] as const);

                        return (
                          <div key={round} className="rounded-card border border-line-soft">
                            <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
                              <p className="font-semibold">Ronda {round} {isFinal ? "· DEFINITIVA" : ""}</p>
                              <p className="text-xs text-muted">A favor: {c.aFavor} · En contra: {c.enContra} {round !== 3 ? `· Abstención: ${c.abstencion}` : ""}</p>
                            </div>
                            <div className="divide-y divide-line-soft">
                              {delegates.map((delegate) => {
                                const current = c.map[delegate.id];
                                return (
                                  <form key={delegate.id} action={setResolutionVote.bind(null, committee.code)} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                    <input type="hidden" name="session_id" value={session.id} />
                                    <input type="hidden" name="resolution_group_id" value={group.id} />
                                    <input type="hidden" name="round" value={round} />
                                    <input type="hidden" name="delegate_id" value={delegate.id} />
                                    <p className="text-sm">{delegate.name}</p>
                                    <div className="flex items-center gap-2">
                                      {options.map((vote) => (
                                        <button key={vote} name="vote" value={vote} className={`btn ${current === vote ? "btn-primary" : "btn-quiet"}`}>{VOTE_LABELS[vote]}</button>
                                      ))}
                                      {!current ? <span className="text-xs text-muted">Sin votar</span> : null}
                                    </div>
                                  </form>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-wrap items-center gap-2">
                        <form action={finalizeResolutionGroup.bind(null, committee.code)}>
                          <input type="hidden" name="resolution_group_id" value={group.id} />
                          <input type="hidden" name="status" value="aprobado" />
                          <SubmitButton className="btn btn-primary" pendingText="…">Marcar como APROBADO</SubmitButton>
                        </form>
                        <form action={finalizeResolutionGroup.bind(null, committee.code)}>
                          <input type="hidden" name="resolution_group_id" value={group.id} />
                          <input type="hidden" name="status" value="rechazado" />
                          <SubmitButton className="btn btn-quiet" pendingText="…">Marcar como RECHAZADO</SubmitButton>
                        </form>
                        <form action={deleteResolutionGroup.bind(null, committee.code)}>
                          <input type="hidden" name="resolution_group_id" value={group.id} />
                          <ConfirmSubmitButton className="btn btn-danger" pendingText="…" confirmMessage={`¿Eliminar la alianza "${group.name}"?`}>Eliminar</ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}