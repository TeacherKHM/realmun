"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/panel", label: "Radiografía" },
  { href: "/panel/rubrica", label: "Rúbrica" },
  { href: "/panel/comites", label: "Comités y encargados" },
  { href: "/panel/seguridad", label: "Seguridad" },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del panel" className="flex flex-wrap items-center gap-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-control px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-white/15 font-semibold text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
