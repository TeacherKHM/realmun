import Link from "next/link";
import { Placard } from "@/components/Placard";
import { listCommittees } from "@/lib/data";
import { SCHOOL_NAME } from "@/lib/committees";
import { formatLongDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const committees = await listCommittees();

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/12 px-6 py-4 text-sm text-white/60 sm:px-10">
        <p>{SCHOOL_NAME}</p>
        <p>{formatLongDate()}</p>
      </header>

      <section className="px-6 pt-14 pb-10 sm:px-10">
        <h1 className="font-display text-[clamp(3.5rem,11vw,8rem)] leading-[0.9] text-white">
          RealMUN
        </h1>
        <p className="mt-4 max-w-[52ch] text-base text-white/70">
          Consola de comités del modelo de Naciones Unidas. Cada comité lleva su cronómetro,
          asistencia, sanciones, hojas de resolución y rúbrica de evaluación.
        </p>
      </section>

      <section className="flex-1 px-6 pb-16 sm:px-10">
        <div className="flex items-center justify-between gap-4 border-b border-white/25 pb-4">
          <p className="text-sm text-white/60">Cuatro comités en sesión</p>
          <Link
            href="/login"
            className="text-sm text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            Soy encargado
          </Link>
        </div>

        {committees.length === 0 ? (
          <p className="mt-8 text-white/60">Todavía no hay comités registrados.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {committees.map((committee, index) => (
              <Placard key={committee.id} committee={committee} index={index} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/12 px-6 py-5 text-xs text-white/45 sm:px-10">
        RealMUN · {SCHOOL_NAME} · Cronómetro y registros sincronizados en vivo con la pantalla del comité.
      </footer>
    </main>
  );
}
