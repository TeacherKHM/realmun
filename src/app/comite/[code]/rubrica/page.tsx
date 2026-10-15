import { clearRubric, saveRubric } from "@/app/actions/rubric";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, NoSession, PageHeader, Panel } from "@/components/ui";
import { getRubricMap, listDelegates, resolveConsole } from "@/lib/data";
import { formatScore } from "@/lib/format";
import { RUBRIC_CRITERIA, RUBRIC_SCALE, rubricAverage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RubricPage({ params }: PageProps<"/comite/[code]/rubrica">) {
  const { code } = await params;
  const { committee, session } = await resolveConsole(code);

  if (!session) {
    return (
      <>
        <PageHeader title="Rúbrica" description="Evaluación de cada delegado por sesión." />
        <NoSession code={committee.code} />
      </>
    );
  }

  const [delegates, rubric] = await Promise.all([
    listDelegates(committee.id, true),
    getRubricMap(session.id),
  ]);

  if (delegates.length === 0) {
    return (
      <>
        <PageHeader title="Rúbrica" description="Evaluación de cada delegado por sesión." />
        <Empty>Agrega delegados antes de evaluarlos.</Empty>
      </>
    );
  }

  const evaluated = delegates.filter((delegate) => rubric[delegate.id]);
  const committeeAverage =
    evaluated.length > 0
      ? Math.round(
          (evaluated.reduce((sum, delegate) => sum + (rubricAverage(rubric[delegate.id].scores) ?? 0), 0) /
            evaluated.length) *
            10,
        ) / 10
      : null;

  return (
    <>
      <PageHeader
        title="Rúbrica"
        description={`${RUBRIC_CRITERIA.length} criterios, escala ${RUBRIC_SCALE.min} a ${RUBRIC_SCALE.max}, por delegado y sesión (${session.title}).`}
      />

      <Panel
        title="Estado de las evaluaciones"
        description={`${evaluated.length} de ${delegates.length} delegados evaluados · promedio actual ${formatScore(committeeAverage)}`}
        className="mb-5"
      >
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {delegates.map((delegate) => {
            const row = rubric[delegate.id];
            const average = rubricAverage(row?.scores);
            return (
              <li
                key={delegate.id}
                className="flex items-baseline justify-between rounded-control border border-line-soft bg-paper px-3 py-2 text-sm"
              >
                <span>{delegate.name}</span>
                <span className={`font-clock text-lg ${average === null ? "text-muted" : ""}`}>
                  {formatScore(average)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="space-y-3">
        {delegates.map((delegate) => {
          const row = rubric[delegate.id];
          const saved = new Map((row?.scores ?? []).map((item) => [item.key, item.score]));

          return (
            <details key={delegate.id} className="panel">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span>
                  <span className="font-semibold">{delegate.name}</span>
                  {delegate.delegation ? (
                    <span className="text-sm text-muted"> · {delegate.delegation}</span>
                  ) : null}
                </span>
                <span className="font-clock text-xl">
                  {row ? formatScore(rubricAverage(row.scores)) : "sin evaluar"}
                </span>
              </summary>

              <div className="border-t border-line-soft px-5 py-5">
                <form action={saveRubric}>
                  <input type="hidden" name="session_id" value={session.id} />
                  <input type="hidden" name="delegate_id" value={delegate.id} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {RUBRIC_CRITERIA.map((criterion) => (
                      <div key={criterion.key}>
                        <label className="label" htmlFor={`${delegate.id}-${criterion.key}`}>
                          {criterion.label}
                        </label>
                        <input
                          id={`${delegate.id}-${criterion.key}`}
                          name={`score_${criterion.key}`}
                          type="number"
                          min={RUBRIC_SCALE.min}
                          max={RUBRIC_SCALE.max}
                          defaultValue={saved.get(criterion.key) ?? 8}
                          className="field w-24"
                        />
                        <p className="mt-1 text-xs text-muted">{criterion.hint}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="label" htmlFor={`${delegate.id}-comment`}>
                      Comentario
                    </label>
                    <textarea
                      id={`${delegate.id}-comment`}
                      name="comment"
                      rows={2}
                      defaultValue={row?.comment ?? ""}
                      className="field"
                      placeholder="Observaciones para la retroalimentación"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <SubmitButton pendingText="Guardando…">Guardar evaluación</SubmitButton>
                  </div>
                </form>

                {row ? (
                  <form action={clearRubric} className="mt-3">
                    <input type="hidden" name="session_id" value={session.id} />
                    <input type="hidden" name="delegate_id" value={delegate.id} />
                    <SubmitButton className="btn btn-danger" pendingText="…">
                      Borrar evaluación
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
