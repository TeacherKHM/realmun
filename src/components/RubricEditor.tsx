import { clearRubric, saveRubric } from "@/app/actions/rubric";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Panel } from "@/components/ui";
import { formatScore } from "@/lib/format";
import {
  getRubricCriteria,
  RUBRIC_SCALE,
  rubricAverage,
  type Committee,
  type Delegate,
  type RubricRow,
  type SessionRow,
} from "@/lib/types";

export function RubricEditor({
  committee,
  session,
  delegates,
  rubric,
}: {
  committee: Committee;
  session: SessionRow;
  delegates: Delegate[];
  rubric: Record<string, RubricRow>;
}) {
  const rubricCriteria = getRubricCriteria(committee);
  const evaluated = delegates.filter((delegate) => rubric[delegate.id]);
  const committeeAverage =
    evaluated.length > 0
      ? Math.round(
          (evaluated.reduce(
            (sum, delegate) => sum + (rubricAverage(rubric[delegate.id].scores) ?? 0),
            0,
          ) /
            evaluated.length) *
            10,
        ) / 10
      : null;

  return (
    <>
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
                className="flex items-baseline justify-between gap-3 rounded-control border border-line-soft bg-paper px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{delegate.name}</span>
                <span className={`font-clock tabular-nums text-lg ${average === null ? "text-muted" : ""}`}>
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
                <span className="min-w-0">
                  <span className="break-words font-semibold">{delegate.name}</span>
                  {delegate.delegation ? (
                    <span className="text-sm text-muted"> · {delegate.delegation}</span>
                  ) : null}
                </span>
                <span className="font-clock tabular-nums text-xl">
                  {row ? formatScore(rubricAverage(row.scores)) : "sin evaluar"}
                </span>
              </summary>

              <div className="border-t border-line-soft px-5 py-5">
                <p className="mb-4 text-xs text-muted">
                  {rubricCriteria.length} criterios · escala {RUBRIC_SCALE.min} a {RUBRIC_SCALE.max} ·{" "}
                  {session.title}
                </p>

                <form action={saveRubric.bind(null, committee.code)}>
                  <input type="hidden" name="session_id" value={session.id} />
                  <input type="hidden" name="delegate_id" value={delegate.id} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {rubricCriteria.map((criterion) => (
                      <div key={criterion.key}>
                        <label className="label" htmlFor={`${delegate.id}-${criterion.key}`}>
                          {criterion.label}
                        </label>
                        <input
                          id={`${delegate.id}-${criterion.key}`}
                          name={`score_${criterion.key}`}
                          type="number"
                          inputMode="numeric"
                          min={RUBRIC_SCALE.min}
                          max={RUBRIC_SCALE.max}
                          defaultValue={saved.get(criterion.key) ?? 8}
                          className="field w-24 tabular-nums"
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
                      placeholder="Observaciones para la retroalimentación…"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <SubmitButton pendingText="Guardando…">Guardar evaluación</SubmitButton>
                  </div>
                </form>

                {row ? (
                  <form action={clearRubric.bind(null, committee.code)} className="mt-3">
                    <input type="hidden" name="session_id" value={session.id} />
                    <input type="hidden" name="delegate_id" value={delegate.id} />
                    <ConfirmSubmitButton
                      className="btn btn-danger"
                      pendingText="…"
                      confirmMessage={`¿Borrar la evaluación de ${delegate.name} en esta sesión?`}
                    >
                      Borrar evaluación
                    </ConfirmSubmitButton>
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
