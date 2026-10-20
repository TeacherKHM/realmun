import Link from "next/link";
import { updateCommittee, updateEncargado } from "@/app/actions/committees";
import { PasswordForm } from "@/components/PasswordForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, PageHeader } from "@/components/ui";
import { requireDireccion } from "@/lib/auth";
import { committeeEmail } from "@/lib/committees";
import { listCommittees, listProfiles } from "@/lib/data";
import { adminKeyStatus } from "@/lib/supabase/admin";
import type { AdminKeyState } from "@/lib/supabase/admin";
import type { Committee, ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelCommitteesPage() {
  await requireDireccion();

  const [committees, profiles] = await Promise.all([listCommittees(), listProfiles()]);
  const keyStatus = await adminKeyStatus();

  return (
    <>
      <PageHeader
        title="Comités y encargados"
        description="Pon el nombre, la sigla y el tema de cada comité y el nombre de su encargado. Lo que guardes aquí se ve en la portada, en las consolas y en la pantalla de TV."
      />

      {committees.length === 0 ? (
        <Empty>Todavía no hay comités registrados en la base de datos.</Empty>
      ) : (
        <>
          {keyStatus !== "ok" ? (
            <p
              role="alert"
              className="mb-5 rounded-control border border-sanction/40 bg-sanction/5 px-4 py-3 text-sm text-sanction"
            >
              {keyStatus === "missing"
                ? "El cambio de contraseñas está desactivado: falta SUPABASE_SECRET_KEY en el servidor."
                : "El cambio de contraseñas está desactivado: la clave secreta del servidor no es válida."}{" "}
              El resto del panel funciona con normalidad.
            </p>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2">
            {committees.map((committee) => (
              <CommitteeAdminCard
                key={committee.id}
                committee={committee}
                keyStatus={keyStatus}
                encargado={
                  profiles.find(
                    (profile) =>
                      profile.committee_id === committee.id && profile.role === "encargado",
                  ) ?? null
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CommitteeAdminCard({
  committee,
  encargado,
  keyStatus,
}: {
  committee: Committee;
  encargado: ProfileRow | null;
  keyStatus: AdminKeyState;
}) {
  return (
    <section id={`comite-${committee.code}`} className="panel scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-3xl leading-none">
            <span aria-hidden className="h-6 w-1.5" style={{ background: committee.accent }} />
            {committee.sigla}
          </h2>
          <p className="mt-1 break-words text-sm text-muted">
            {committee.name}
            {committee.topic ? ` · ${committee.topic}` : ""}
          </p>
        </div>
        <Link href={`/comite/${committee.code}`} className="btn btn-quiet">
          Abrir consola
        </Link>
      </div>

      <div className="space-y-5 px-5 py-5">
        <form action={updateCommittee} className="space-y-3">
          <input type="hidden" name="code" value={committee.code} />

          <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
            <label className="block">
              <span className="label">Sigla</span>
              <input name="sigla" defaultValue={committee.sigla} required maxLength={12} className="field" />
            </label>
            <label className="block">
              <span className="label">Nombre del comité</span>
              <input name="name" defaultValue={committee.name} required className="field" />
            </label>
          </div>

          <label className="block">
            <span className="label">Tema</span>
            <input
              name="topic"
              defaultValue={committee.topic ?? ""}
              placeholder="Tema o tópico del comité"
              className="field"
            />
          </label>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block">
              <span className="label">Color</span>
              <input
                type="color"
                name="accent"
                defaultValue={committee.accent}
                className="h-10 w-16 rounded-control border border-line bg-white p-1"
                aria-label="Color del comité"
              />
            </label>
            <SubmitButton className="btn btn-primary" pendingText="Guardando…">
              Guardar comité
            </SubmitButton>
          </div>
        </form>

        <form
          action={updateEncargado}
          className="space-y-3 border-t border-line-soft pt-4"
        >
          <input type="hidden" name="committee_id" value={committee.id} />

          <label className="block">
            <span className="label">Encargado del comité</span>
            <input
              name="display_name"
              defaultValue={encargado?.display_name ?? ""}
              placeholder="Nombre de quien lleva el comité"
              className="field"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Cuenta: <span className="font-clock">{committeeEmail(committee.code)}</span>
              {encargado ? "" : " · sin cuenta de encargado"}
            </p>
            <SubmitButton className="btn btn-quiet" pendingText="Guardando…">
              Guardar encargado
            </SubmitButton>
          </div>
        </form>

        <PasswordForm code={committee.code} sigla={committee.sigla} status={keyStatus} />
      </div>
    </section>
  );
}
