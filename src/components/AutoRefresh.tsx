"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantiene vivo el panel de dirección refrescando la vista del servidor
 * cada `seconds` (sin recargar la página completa).
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);

  return null;
}
