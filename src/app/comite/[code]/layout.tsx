import Link from "next/link";
import { setActiveSession } from "@/app/actions/sessions";
import { NavRail } from "@/components/NavRail";
import { SubmitButton } from "@/components/SubmitButton";
import { requireCommittee } from "@/lib/auth";
import { listSessions } from "@/lib/data";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CommitteeLayout({
  children,
  params,
}: LayoutProps<"/comite/[code]">) {
  const { code } = await params;
  const { committee, displayName } = await requireCommittee(code);
  const sessions = await listSessions(committee.id);
  const active = sessions.find((item) => item.id === committee.active_session_id) ?? null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="lg:sticky lg:top-0 lg:h-dvh">
        <NavRail code={committee.code} sigla={committee.sigla} accent={committee.accent} />
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-line bg-paper-warm px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-display text-3xl leading-none">
                <span aria-hidden className="h-6 w-1.5" style={{ background: committee.accent }} />
                {committee.sigla}
              </p>
              <p className="mt-1 text-sm text-muted">
                {committee.name}
                {committee.topic ? ` · ${committee.topic}` : ""}
                {displayName ? ` · ${displayName}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/vista-tv/${committee.code}`}
                target="_blank"
                className="btn btn-quiet"
              >
                Pantalla de TV
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
            <span className="text-xs font-semibold text-muted">Sesión en curso</span>
            {sessions.length > 0 ? (
              <form action={setActiveSession} className="flex flex-wrap items-center gap-2">
                <select name="session_id" defaultValue={active?.id ?? ""} className="field w-auto">
                  {sessions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {formatShortDate(item.session_date)}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn btn-quiet" pendingText="Cambiando…">
                  Cambiar
                </SubmitButton>
              </form>
            ) : (
              <Link
                href={`/comite/${committee.code}/sesiones`}
                className="text-sm text-ink underline decoration-line underline-offset-4"
              >
                Crear la primera sesión
              </Link>
            )}
            {active ? (
              <span
                className={`border px-2 py-0.5 text-xs ${
                  active.status === "activa"
                    ? "border-ok/40 text-ok"
                    : "border-line text-muted"
                }`}
              >
                {active.status === "activa" ? "activa" : "finalizada"}
              </span>
            ) : null}
          </div>
        </header>

        <div className="flex-1 px-5 py-7 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
