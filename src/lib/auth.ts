import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMMITTEE_COLUMNS } from "@/lib/committees";
import type { Committee, ProfileRole } from "@/lib/types";

export type CommitteeSession = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: ProfileRole;
  committee: Committee;
};

type ProfileJoin = {
  committee_id: string;
  display_name: string | null;
  role: string | null;
  committees: Committee | Committee[] | null;
};

function firstCommittee(value: ProfileJoin["committees"]): Committee | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getSession(): Promise<CommitteeSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "committee_id, display_name, role, committees(id, code, sigla, name, topic, accent, sort_order, active_session_id)",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileJoin>();

  const committee = firstCommittee(data?.committees ?? null);
  if (!committee) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: data?.display_name ?? null,
    role: data?.role === "direccion" ? "direccion" : "encargado",
    committee,
  };
}

export async function requireSession(): Promise<CommitteeSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Comité por su código de ruta (lo usa la dirección para entrar a cualquiera). */
async function committeeByCode(code: string): Promise<Committee | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("committees")
    .select(COMMITTEE_COLUMNS)
    .eq("code", code)
    .maybeSingle<Committee>();
  return data ?? null;
}

/** Sesión válida y perteneciente al comité de la ruta; si no, redirige.
 *  La dirección puede entrar a la consola de cualquier comité. */
export async function requireCommittee(code: string): Promise<CommitteeSession> {
  const session = await requireSession();
  if (session.committee.code === code) return session;

  if (session.role === "direccion") {
    const committee = await committeeByCode(code);
    if (!committee) notFound();
    return { ...session, committee };
  }

  redirect(`/comite/${session.committee.code}`);
}

/** Sesión de la dirección de RealMUN; a cualquier otra cuenta la manda a su comité. */
export async function requireDireccion(): Promise<CommitteeSession> {
  const session = await requireSession();
  if (session.role !== "direccion") redirect(`/comite/${session.committee.code}`);
  return session;
}
