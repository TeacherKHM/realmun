import { requireCommittee } from "@/lib/auth";
import { COMMITTEE_COLUMNS } from "@/lib/committees";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceRow,
  Committee,
  Delegate,
  DireccionSnapshot,
  ProfileRow,
  ResolutionRow,
  RubricRow,
  SanctionRow,
  SessionRow,
  TimerState,
} from "@/lib/types";

export async function listCommittees(): Promise<Committee[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("committees")
    .select(COMMITTEE_COLUMNS)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Committee[];
}

export async function getCommittee(code: string): Promise<Committee | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("committees")
    .select(COMMITTEE_COLUMNS)
    .eq("code", code)
    .maybeSingle<Committee>();
  return data ?? null;
}

/**
 * Cuentas de la app (una por comité + la dirección). Solo la dirección las ve
 * todas: el RLS de `profiles` deja a cada encargado con su propia fila.
 */
export async function listProfiles(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, committee_id, display_name, role")
    .order("role", { ascending: true })
    .order("committee_id", { ascending: true });
  return (data ?? []) as ProfileRow[];
}

/**
 * Sesión y comité de la ruta /comite/[code], con la sesión activa ya resuelta.
 * Lanza redirección si no hay sesión válida de ese comité.
 */
export async function resolveConsole(code: string) {
  const { committee } = await requireCommittee(code);
  const sessions = await listSessions(committee.id);
  const session = sessions.find((item) => item.id === committee.active_session_id) ?? null;
  return { committee, session, sessions };
}

export async function listSessions(committeeId: string): Promise<SessionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id, committee_id, title, session_date, status, created_at")
    .eq("committee_id", committeeId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as SessionRow[];
}

export async function listDelegates(committeeId: string, onlyActive = false): Promise<Delegate[]> {
  const supabase = await createClient();
  let query = supabase
    .from("delegates")
    .select("id, committee_id, name, delegation, active, sort_order")
    .eq("committee_id", committeeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (onlyActive) query = query.eq("active", true);

  const { data } = await query;
  return (data ?? []) as Delegate[];
}

export async function getAttendanceMap(
  sessionId: string,
): Promise<Record<string, AttendanceRow>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, session_id, delegate_id, status, note, updated_at")
    .eq("session_id", sessionId);

  const map: Record<string, AttendanceRow> = {};
  for (const row of (data ?? []) as AttendanceRow[]) map[row.delegate_id] = row;
  return map;
}

export async function listSanctions(committeeId: string, sessionId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("sanctions")
    .select("id, committee_id, session_id, delegate_id, type, reason, created_at")
    .eq("committee_id", committeeId)
    .order("created_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data } = await query;
  return (data ?? []) as SanctionRow[];
}

export async function listResolutions(committeeId: string, sessionId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("resolutions")
    .select("id, committee_id, session_id, delegate_id, version, received_at, notes")
    .eq("committee_id", committeeId)
    .order("received_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data } = await query;
  return (data ?? []) as ResolutionRow[];
}

export async function getRubricMap(sessionId: string): Promise<Record<string, RubricRow>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rubric_scores")
    .select("id, committee_id, session_id, delegate_id, scores, comment, updated_at")
    .eq("session_id", sessionId);

  const map: Record<string, RubricRow> = {};
  for (const row of (data ?? []) as RubricRow[]) map[row.delegate_id] = row;
  return map;
}

/**
 * Radiografía de todos los comités para el panel de dirección.
 * La RPC es security definer y solo responde si la cuenta tiene rol 'direccion'.
 */
export async function loadDireccionSnapshot(): Promise<DireccionSnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("direccion_stats");
  if (error) throw new Error(error.message);

  const raw = (data ?? {}) as Partial<DireccionSnapshot>;
  return {
    now: raw.now ?? new Date().toISOString(),
    committees: raw.committees ?? [],
  };
}

export async function getTimerState(committeeId: string): Promise<TimerState | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timer_state")
    .select(
      "committee_id, mode, running, label, speaker, ends_at, remaining_ms, started_at, elapsed_ms, updated_at",
    )
    .eq("committee_id", committeeId)
    .maybeSingle<TimerState>();
  return data ?? null;
}

export async function listResolutionGroups(committeeId: string, sessionId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("resolution_groups")
    .select("id, committee_id, session_id, name, sponsors, notes, status, created_at")
    .eq("committee_id", committeeId)
    .order("created_at", { ascending: true });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data } = await query;
  return (data ?? []) as import("@/lib/types").ResolutionGroupRow[];
}

export async function listResolutionVotes(committeeId: string, sessionId?: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("resolution_votes")
    .select("id, committee_id, session_id, resolution_group_id, round, delegate_id, vote, created_at, updated_at")
    .eq("committee_id", committeeId)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data } = await query;
  return (data ?? []) as import("@/lib/types").ResolutionVoteRow[];
}
