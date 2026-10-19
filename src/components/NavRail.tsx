"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";

type Props = {
  code: string;
  sigla: string;
  accent: string;
  isDireccion?: boolean;
};

const SECTIONS = [
  { slug: "", label: "Resumen" },
  { slug: "asistencia", label: "Asistencia" },
  { slug: "cronometro", label: "Cronómetro" },
  { slug: "sanciones", label: "Sanciones" },
  { slug: "hojas", label: "Hojas de resolución" },
  { slug: "rubrica", label: "Rúbrica" },
  { slug: "delegados", label: "Delegados" },
  { slug: "sesiones", label: "Sesiones" },
];

export function NavRail({ code, sigla, accent, isDireccion = false }: Props) {
  const pathname = usePathname();
  const base = `/comite/${code}`;

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="border-b border-white/12 px-5 py-5">
        <Link href="/" className="block font-display text-3xl leading-none text-white">
          RealMUN
        </Link>
        <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
          <span
            aria-hidden
            className="inline-block h-3 w-3 shrink-0"
            style={{ background: accent }}
          />
          {sigla}
        </p>
        {isDireccion ? (
          <Link
            href="/panel"
            className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-white/25 px-2.5 py-1 text-xs text-white/70 hover:border-white/50 hover:text-white"
          >
            ← Panel de dirección
          </Link>
        ) : null}
      </div>

      <nav className="flex-1 py-3" aria-label="Secciones del comité">
        {SECTIONS.map((section) => {
          const href = section.slug ? `${base}/${section.slug}` : base;
          const active = pathname === href;
          return (
            <Link key={section.slug || "resumen"} href={href} className="rail-link" data-active={active} aria-current={active ? "page" : undefined}>
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/12 px-5 py-4">
        <Link href={`/vista-tv/${code}`} target="_blank" className="link text-white/70 hover:text-white" rel="noopener noreferrer">
          Abrir pantalla de TV
        </Link>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="mt-3 text-sm text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
