import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LiveTimer } from "@/components/LiveTimer";
import { RefreshButton } from "@/components/RefreshButton";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { requireDireccion } from "@/lib/auth";
import { loadDireccionSnapshot } from "@/lib/data";
import { formatLongDate, formatScore, formatShortDate, formatTime, pluralize } from "@/lib/format";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_ORDER,
  SANCTION_PLURAL_LABELS,
  SANCTION_ORDER,
  type AttendanceStatus,
  type DireccionCommittee,
} from "@/lib/types";

export const dynamic = "force-dynamic";

/** Refresco automático del panel (segundos). */
const REFRESH_SECONDS = 15;

export default async function DirectorPanelPage() {
  const { displayName } = await requireDireccion();
  const snapshot = await loadDireccionSnapshot();
  const committees = snapshot.committees;

  const inSession = committees.filter((committee) => committee.session?.status === "activa");
  const delegatesTotal = committees.reduce((sum, c) => sum + c.delegates_total, 0);
  const present = sumPresence(committees, "presente");
  const sanctions = committees.reduce(
    (sum, c) => sum + SANCTION_ORDER.reduce((acc, type) => acc + (c.sanctions[type] ?? 0), 0),
    0,
  );
  const resolutions = committees.reduce((sum, c) => sum + c.resolutions, 0);

  return (
    <>
      <PageHeader
        title="Panel de dirección"
        description={`${displayName ? `${displayName} · ` : ""}${formatLongDate()} · ${pluralize(
          committees.length,
          "comité",
          "comités",
        )} registrados. Lectura de ${formatTime(snapshot.now)}; se actualiza solo cada ${REFRESH_SECONDS} segundos.`}
        actions={<RefreshButton />}
      />
      <AutoRefresh seconds={REFRESH_SECONDS} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Comités en sesión"
          value={`${inSession.length} de ${committees.length}`}
          hint="Con sesión activa"
          tone={inSession.length > 0 ? "ok" : "default"}
        />
        <Stat
          label="Delegados en sala"
          value={`${present} / ${delegatesTotal}`}
          hint="Presentes sobre activos"
          tone="ok"
        />
        <Stat
          label="Sanciones"
          value={sanctions}
          hint="De la sesión activa de cada comité"
          tone={sanctions > 0 ? "sanction" : "default"}
        />
        <Stat label="Hojas de resolución" value={resolutions} hint="Recibidas en la sesión" />
      </div>

      {committees.length === 0 ? (
        <div className="mt-6">
          <Empty>Todavía no hay comités registrados en la base de datos.</Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {committees.map((committee) => (
            <CommitteeCard key={committee.code} committee={committee} serverNow={snapshot.now} />
          ))}
        </div>
      )}
    </>
  );
}

function sumPresence(committees: DireccionCommittee[], status: AttendanceStatus) {
  return committees.reduce((sum, committee) => sum + (committee.presence[status] ?? 0), 0);
}

function CommitteeCard({
  committee,
  serverNow,
}: {
  committee: DireccionCommittee;
  serverNow: string;
}) {
  const session = committee.session;
  const present = committee.presence.presente ?? 0;
  const registered = ATTENDANCE_ORDER.reduce(
    (sum, status) => sum + (committee.presence[status] ?? 0),
    0,
  );
  const unregistered = Math.max(0, committee.delegates_total - registered);
  const presencePct =
    committee.delegates_total > 0 ? Math.round((present / committee.delegates_total) * 100) : 0;
  const committeeSanctions = SANCTION_ORDER.reduce(
    (sum, type) => sum + (committee.sanctions[type] ?? 0),
    0,
  );
  const timer = committee.timer;

  return (
    <article
      className="placard"
      data-flat
      style={{ "--placard-accent": committee.accent } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-display text-3xl leading-none">{committee.sigla}</h2>
          <p className="mt-2 break-words text-sm text-muted">
            {committee.name}
            {committee.topic ? ` · ${committee.topic}` : ""}
          </p>
        </div>
        <span
          className={`rounded-chip border px-2 py-0.5 text-xs ${
            session?.status === "activa"
              ? "border-ok/40 text-ok"
              : timer?.running
                ? "border-flag/40 text-plenary"
                : "border-line text-muted"
          }`}
        >
          {session
            ? session.status === "activa"
              ? "en sesión"
              : "sesión finalizada"
            : "sin sesión activa"}
        </span>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-sm">
        {session
          ? `${session.title} · ${formatShortDate(session.date)}`
          : "Este comité todavía no tiene una sesión activa."}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        {timer && (timer.running || timer.remaining_ms !== null || timer.elapsed_ms !== null) ? (
          <LiveTimer state={timer} serverNow={serverNow} compact />
        ) : (
          <p className="text-sm text-muted">Cronómetro en espera</p>
        )}
        <p className="min-w-0 break-words text-xs text-muted">
          {timer?.running ? "Cronómetro en marcha" : "Cronómetro detenido"}
          {timer?.label ? ` · ${timer.label}` : ""}
          <br />
          {timer?.speaker ? `Orador: ${timer.speaker}` : "Sin orador asignado"}
        </p>
      </div>

      <div className="mt-4 border-t border-line-soft pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm">
            <span className="font-clock tabular-nums text-2xl">{present}</span>{" "}
            <span className="text-muted">de {committee.delegates_total} delegados en sala</span>
          </p>
          <p className="font-clock tabular-nums text-xs text-muted">{presencePct}%</p>
        </div>
        <div className="mt-2 h-1.5 rounded-chip bg-line-soft" aria-hidden>
          <div
            className="h-full rounded-chip bg-ok"
            style={{ width: `${Math.min(100, presencePct)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {ATTENDANCE_ORDER.filter((status) => status !== "presente").map((status) => (
            <span key={status}>
              {ATTENDANCE_LABELS[status]}:{" "}
              <span className="font-clock tabular-nums">{committee.presence[status] ?? 0}</span>
            </span>
          ))}
          {unregistered > 0 ? (
            <span>
              Sin registro: <span className="font-clock tabular-nums">{unregistered}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line-soft pt-3 text-center">
        <div>
          <p className="text-xs text-muted">Sanciones</p>
          <p
            className={`font-clock tabular-nums text-2xl ${
              committeeSanctions > 0 ? "text-sanction" : ""
            }`}
          >
            {committeeSanctions}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Hojas</p>
          <p className="font-clock tabular-nums text-2xl">{committee.resolutions}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Rúbrica</p>
          <p className="font-clock tabular-nums text-2xl">
            {formatScore(committee.rubric?.average ?? null)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-xs text-muted">
        {SANCTION_ORDER.map((type) => (
          <span key={type}>
            {SANCTION_PLURAL_LABELS[type]}:{" "}
            <span className="font-clock tabular-nums">{committee.sanctions[type] ?? 0}</span>
          </span>
        ))}
        <span>
          Rúbrica: {committee.rubric?.evaluated ?? 0} de {committee.delegates_total} evaluados
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Link href={`/comite/${committee.code}`} className="btn btn-primary">
          Abrir consola
        </Link>
        <Link href={`/comite/${committee.code}/asistencia`} className="btn btn-quiet">
          Asistencia
        </Link>
        <Link href={`/comite/${committee.code}/delegados`} className="btn btn-quiet">
          Delegados
        </Link>
        <Link href={`/vista-tv/${committee.code}`} target="_blank" className="btn btn-quiet" rel="noopener noreferrer">
          TV
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <Link
          href={`/panel/comites#comite-${committee.code}`}
          className="link"
        >
          Editar nombre del comité y del encargado
        </Link>
        <span>{pluralize(committee.sessions_total, "sesión registrada", "sesiones registradas")}</span>
      </div>
    </article>
  );
}
