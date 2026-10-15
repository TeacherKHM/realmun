import Link from "next/link";
import type { Committee } from "@/lib/types";

type Props = {
  committee: Committee;
  index: number;
};

/** Placa de delegación: la pieza que identifica al modelo sobre la mesa. */
export function Placard({ committee, index }: Props) {
  return (
    <article
      className="placard animate-placard"
      style={{
        // @ts-expect-error propiedad personalizada consumida por globals.css
        "--placard-accent": committee.accent,
        animationDelay: `${index * 90}ms`,
      }}
    >
      <p className="font-display text-4xl leading-none">{committee.sigla}</p>
      <h2 className="mt-3 text-xl">{committee.name}</h2>
      <p className="mt-1 min-h-[2.75rem] text-sm text-muted">{committee.topic ?? "Tema por definir"}</p>

      <div className="mt-6 flex items-end justify-between gap-3 border-t border-line pt-3">
        <Link
          href={`/login?next=${encodeURIComponent(`/comite/${committee.code}`)}`}
          className="text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          Entrar al comité
        </Link>
        <Link
          href={`/vista-tv/${committee.code}`}
          className="text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          Ver TV
        </Link>
      </div>
    </article>
  );
}
