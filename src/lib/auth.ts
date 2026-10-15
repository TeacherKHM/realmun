import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Committee } from "@/lib/types";

export type CommitteeSession = {
  userId: string;
  email: string | null;
  displayName: string | null;
  committee: Committee;
};

type ProfileJoin = {
  committee_id: string;
  display_name: string | null;
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
      "committee_id, display_name, committees(id, code, sigla, name, topic, accent, sort_order, active_session_id)",
    )
    .eq("user_id", user.id)
    .maybeSingle<ProfileJoin>();

  const committee = firstCommittee(data?.committees ?? null);
  if (!committee) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: data?.display_name ?? null,
    committee,
  };
}

export async function requireSession(): Promise<CommitteeSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Sesión válida y perteneciente al comité de la ruta; si no, redirige. */
export async function requireCommittee(code: string): Promise<CommitteeSession> {
  const session = await requireSession();
  if (session.committee.code !== code) redirect(`/comite/${session.committee.code}`);
  return session;
}
