import type { Metadata } from "next";
import Link from "next/link";
import { DireccionForm } from "@/components/DireccionForm";
import { SCHOOL_NAME } from "@/lib/committees";

export const metadata: Metadata = {
  title: "Acceso de dirección · RealMUN",
  // No es un secreto, pero tampoco debe aparecer en buscadores.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function DireccionLoginPage() {
  return (
    <main id="contenido" className="flex min-h-dvh flex-col bg-ink text-white">
      <div aria-hidden className="h-1.5 bg-gold" />

      <header className="flex items-center justify-between px-6 py-5 text-sm text-white/70 sm:px-10">
        <Link href="/" className="font-display text-2xl text-white">
          RealMUN
        </Link>
        <p>{SCHOOL_NAME}</p>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-card border border-white/15 bg-white/[0.05] px-6 py-8 sm:px-9">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
            Dirección
          </p>
          <h1 className="mt-2 font-display text-4xl leading-none">Panel del modelo</h1>
          <p className="mt-3 text-sm text-white/70">
            Solo el presidente o el encargado general. Desde aquí se ven y se editan los
            cuatro comités.
          </p>

          <DireccionForm />
        </div>
      </div>

      <footer className="px-6 py-5 text-xs text-white/55 sm:px-10">
        Acceso restringido · los intentos fallidos se limitan por cuenta y equipo.
      </footer>
    </main>
  );
}
