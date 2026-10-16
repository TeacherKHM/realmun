"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Botón de actualización manual del panel de dirección. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-quiet"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Actualizando…" : "Actualizar ahora"}
    </button>
  );
}
