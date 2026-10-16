import { getSession, type CommitteeSession } from "@/lib/auth";
import { getCommittee } from "@/lib/data";

/** Sesión obligatoria para cualquier mutación del panel. */
export async function guardSession(): Promise<CommitteeSession> {
  const session = await getSession();
  if (!session) throw new Error("Tu sesión expiró. Vuelve a entrar.");
  return session;
}

/**
 * Sesión válida para mutar el comité `code`.
 * Un encargado solo puede tocar su propio comité; la dirección, cualquiera.
 */
export async function guardCommittee(code: string): Promise<CommitteeSession> {
  const session = await guardSession();
  if (session.committee.code === code) return session;

  if (session.role !== "direccion") {
    throw new Error("No puedes modificar otro comité.");
  }

  const committee = await getCommittee(code);
  if (!committee) throw new Error("Ese comité no existe.");
  return { ...session, committee };
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
