"use client";

import { useEffect } from "react";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel px-5 py-6">
      <h1 className="text-2xl">No se pudo cargar el panel</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">
        {error.message || "Ocurrió un error al leer los comités. Vuelve a intentarlo."}
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        Reintentar
      </button>
    </div>
  );
}
