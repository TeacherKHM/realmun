import Link from "next/link";

/**
 * Insignia del modelo para el encabezado de cada página.
 *
 * Es la insignia roja con el blanco recortado como transparencia, así que se
 * lee igual sobre los encabezados oscuros (`ink`) y sobre los claros (`paper`)
 * sin necesidad de dos archivos. La genera `npm run logos`.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5"
      aria-label="RealMUN — inicio"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/insignia-rojo-y-blanco-svg-1999x1971.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0"
        style={{ height: size, width: "auto" }}
      />
      <span className="font-display leading-none">RealMUN</span>
    </Link>
  );
}
