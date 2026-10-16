import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireDireccion } from "@/lib/auth";
import { listCommittees } from "@/lib/data";
import { SCHOOL_NAME } from "@/lib/committees";

export const dynamic = "force-dynamic";

export default async function DirectorPanelLayout({ children }: LayoutProps<"/panel">) {
  const { displayName, email } = await requireDireccion();
  const committees = await listCommittees();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Banda de acentos: una por comité, como las marcas de bandera. */}
      <div aria-hidden className="flex h-1.5 shrink-0">
        {committees.map((committee) => (
          <span key={committee.id} className="flex-1" style={{ background: committee.accent }} />
        ))}
      </div>

      <header className="bg-ink text-white">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 sm:px-10">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Link href="/panel" className="font-display text-3xl leading-none text-white">
              RealMUN
            </Link>
            <p className="text-sm text-white/60">Panel de dirección · {SCHOOL_NAME}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <p className="text-white/60">{displayName ?? email}</p>
            <form action={signOut}>
              <button
                type="submit"
                className="text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
