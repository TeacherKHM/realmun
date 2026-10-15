import { getSession, type CommitteeSession } from "@/lib/auth";

/** Sesión obligatoria para cualquier mutación del panel. */
export async function guardSession(): Promise<CommitteeSession> {
  const session = await getSession();
  if (!session) throw new Error("Tu sesión expiró. Vuelve a entrar.");
  return session;
}

export function requireText(value: FormDataEntryValue | null, field: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`Falta el campo: ${field}`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export function requireInt(value: FormDataEntryValue | null, fallback?: number): number {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10);
  if (Number.isFinite(parsed)) return parsed;
  if (fallback !== undefined) return fallback;
  throw new Error("Valor numérico inválido");
}
