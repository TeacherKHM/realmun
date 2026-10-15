import {
  createDelegate,
  deleteDelegate,
  toggleDelegate,
  updateDelegate,
} from "@/app/actions/delegates";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { listDelegates, resolveConsole } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DelegatesPage({ params }: PageProps<"/comite/[code]/delegados">) {
  const { code } = await params;
  const { committee } = await resolveConsole(code);
  const delegates = await listDelegates(committee.id);

  const active = delegates.filter((delegate) => delegate.active);

  return (
    <>
      <PageHeader
        title="Delegados"
        description={`${active.length} activos de ${delegates.length} registrados. Solo los activos aparecen en asistencia, sanciones, hojas y rúbrica.`}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Agregar delegado" description="Nombre del alumno y delegación que representa.">
          <form action={createDelegate} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Nombre
              </label>
              <input id="name" name="name" type="text" required className="field" placeholder="Ana Martínez" />
            </div>
            <div>
              <label className="label" htmlFor="delegation">
                Delegación (opcional)
              </label>
              <input id="delegation" name="delegation" type="text" className="field" placeholder="Francia" />
            </div>
            <div>
              <label className="label" htmlFor="sort_order">
                Orden en la lista
              </label>
              <input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={delegates.length + 1}
                className="field w-24"
              />
            </div>
            <SubmitButton pendingText="Agregando…">Agregar delegado</SubmitButton>
          </form>
        </Panel>

        <Panel title="Plantilla del comité" description="Abre cada delegado para editar sus datos.">
          {delegates.length === 0 ? (
            <Empty>Todavía no hay delegados en este comité.</Empty>
          ) : (
            <ul className="space-y-2">
              {delegates.map((delegate) => (
                <li key={delegate.id} className="rounded-control border border-line bg-white">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="font-semibold">
                        {delegate.name}
                        {delegate.delegation ? (
                          <span className="font-normal text-muted"> · {delegate.delegation}</span>
                        ) : null}
                      </span>
                      <span
                        className={`rounded-chip border px-2 py-0.5 text-xs ${
                          delegate.active ? "border-ok/40 text-ok" : "border-line text-muted"
                        }`}
                      >
                        {delegate.active ? "activo" : "inactivo"}
                      </span>
                    </summary>

                    <div className="border-t border-line-soft px-4 py-4">
                      <form action={updateDelegate} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="delegate_id" value={delegate.id} />
                        <div>
                          <label className="label" htmlFor={`name-${delegate.id}`}>
                            Nombre
                          </label>
                          <input
                            id={`name-${delegate.id}`}
                            name="name"
                            type="text"
                            defaultValue={delegate.name}
                            required
                            className="field"
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor={`delegation-${delegate.id}`}>
                            Delegación
                          </label>
                          <input
                            id={`delegation-${delegate.id}`}
                            name="delegation"
                            type="text"
                            defaultValue={delegate.delegation ?? ""}
                            className="field"
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor={`order-${delegate.id}`}>
                            Orden
                          </label>
                          <input
                            id={`order-${delegate.id}`}
                            name="sort_order"
                            type="number"
                            defaultValue={delegate.sort_order}
                            className="field w-24"
                          />
                        </div>
                        <label className="flex items-center gap-2 self-end text-sm">
                          <input
                            type="checkbox"
                            name="active"
                            defaultChecked={delegate.active}
                            className="size-4 accent-ink"
                          />
                          Activo en el comité
                        </label>
                        <div className="sm:col-span-2">
                          <SubmitButton className="btn btn-primary" pendingText="Guardando…">
                            Guardar cambios
                          </SubmitButton>
                        </div>
                      </form>

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-line-soft pt-3">
                        <form action={toggleDelegate}>
                          <input type="hidden" name="delegate_id" value={delegate.id} />
                          <input type="hidden" name="active" value={delegate.active ? "false" : "true"} />
                          <SubmitButton className="btn btn-quiet" pendingText="…">
                            {delegate.active ? "Marcar inactivo" : "Marcar activo"}
                          </SubmitButton>
                        </form>
                        <form action={deleteDelegate}>
                          <input type="hidden" name="delegate_id" value={delegate.id} />
                          <SubmitButton className="btn btn-danger" pendingText="…">
                            Eliminar delegado
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
