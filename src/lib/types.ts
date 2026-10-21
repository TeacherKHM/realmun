export type AttendanceStatus = "presente" | "ausente" | "justificado" | "retardo";
/** Rol de la cuenta: una por comité ('encargado') o la vista global ('direccion'). */
export type ProfileRole = "encargado" | "direccion";
export type SanctionType =
  | "amonestacion"
  | "advertencia"
  | "disciplina"
  | "expulsion_sesion"
  | "expulsion_dia"
  | "expulsion_mun";
export type TimerMode = "countdown" | "countup";

export type RubricCriterion = {
  key: string;
  label: string;
  hint?: string;
};

export type Committee = {
  id: string;
  code: string;
  sigla: string;
  name: string;
  topic: string | null;
  accent: string;
  sort_order: number;
  active_session_id: string | null;
  rubric_criteria?: RubricCriterion[];
};

export type ProfileRow = {
  user_id: string;
  committee_id: string;
  display_name: string | null;
  role: ProfileRole;
};

export type SessionRow = {
  id: string;
  committee_id: string;
  title: string;
  session_date: string;
  status: "activa" | "finalizada";
  created_at: string;
};

export type Delegate = {
  id: string;
  committee_id: string;
  name: string;
  delegation: string | null;
  active: boolean;
  sort_order: number;
};

export type AttendanceRow = {
  id: string;
  session_id: string;
  delegate_id: string;
  status: AttendanceStatus;
  note: string | null;
  updated_at: string;
};

export type SanctionRow = {
  id: string;
  committee_id: string;
  session_id: string | null;
  delegate_id: string;
  type: SanctionType;
  reason: string;
  created_at: string;
};

export type ResolutionRow = {
  id: string;
  committee_id: string;
  session_id: string | null;
  delegate_id: string;
  version: number;
  received_at: string;
  notes: string | null;
};

export type ResolutionGroupRow = {
  id: string;
  committee_id: string;
  session_id: string | null;
  name: string;
  sponsors: string[];
  notes: string | null;
  status: "presentado" | "aprobado" | "rechazado";
  created_at: string;
};

export type ResolutionVoteRow = {
  id: string;
  committee_id: string;
  session_id: string | null;
  resolution_group_id: string;
  round: 1 | 2 | 3;
  delegate_id: string;
  vote: "a_favor" | "en_contra" | "abstencion";
  created_at: string;
  updated_at: string;
};

export type RubricScore = {
  key: string;
  label: string;
  score: number;
};

export type RubricRow = {
  id: string;
  committee_id: string;
  session_id: string;
  delegate_id: string;
  scores: RubricScore[];
  comment: string | null;
  updated_at: string;
};

export type TimerState = {
  committee_id: string;
  mode: TimerMode;
  running: boolean;
  label: string | null;
  speaker: string | null;
  ends_at: string | null;
  remaining_ms: number | null;
  started_at: string | null;
  elapsed_ms: number | null;
  updated_at: string;
};

/** Radiografía de un comité para el panel de dirección (viene de direccion_stats()). */
export type DireccionCommittee = {
  code: string;
  sigla: string;
  name: string;
  topic: string | null;
  accent: string;
  session: {
    id: string;
    title: string;
    date: string;
    status: "activa" | "finalizada";
  } | null;
  sessions_total: number;
  delegates_total: number;
  presence: Partial<Record<AttendanceStatus, number>>;
  sanctions: Partial<Record<SanctionType, number>>;
  resolutions: number;
  rubric: { evaluated: number; average: number | null };
  timer: TimerState | null;
};

export type DireccionSnapshot = {
  now: string;
  committees: DireccionCommittee[];
};

/** Criterios por defecto de la rúbrica. */
export const RUBRIC_SCALE = { min: 1, max: 10 } as const;

export const DEFAULT_RUBRIC_CRITERIA = [
  { key: "participacion", label: "Participación", hint: "Intervenciones y aportes al debate" },
  { key: "argumentacion", label: "Argumentación", hint: "Solidez de los argumentos y fuentes citadas" },
  { key: "postura", label: "Postura diplomática", hint: "Apego a la política exterior de la delegación" },
  { key: "colaboracion", label: "Colaboración y forma", hint: "Bloques de trabajo, cortesía y protocolo" },
] as const satisfies readonly RubricCriterion[];

/** Criterios de la rúbrica — configurable por comité. */
export const RUBRIC_CRITERIA = DEFAULT_RUBRIC_CRITERIA;

export function getRubricCriteria(committee?: { rubric_criteria?: RubricCriterion[] | null }) {
  const criteria = committee?.rubric_criteria;
  if (Array.isArray(criteria) && criteria.length > 0) {
    return criteria;
  }
  return [...DEFAULT_RUBRIC_CRITERIA];
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  presente: "Presente",
  ausente: "Ausente",
  justificado: "Justificado",
  retardo: "Retardo",
};

export const SANCTION_LABELS: Record<SanctionType, string> = {
  amonestacion: "Amonestación",
  advertencia: "Advertencia",
  disciplina: "Disciplina",
  expulsion_sesion: "Expulsión por sesión",
  expulsion_dia: "Expulsión por día",
  expulsion_mun: "Expulsión del MUN",
};

export const SANCTION_PLURAL_LABELS: Record<SanctionType, string> = {
  amonestacion: "Amonestaciones",
  advertencia: "Advertencias",
  disciplina: "Disciplina",
  expulsion_sesion: "Expulsiones por sesión",
  expulsion_dia: "Expulsiones por día",
  expulsion_mun: "Expulsiones del MUN",
};

export const SANCTION_ORDER: SanctionType[] = [
  "amonestacion",
  "advertencia",
  "disciplina",
  "expulsion_sesion",
  "expulsion_dia",
  "expulsion_mun",
];

export const ATTENDANCE_ORDER: AttendanceStatus[] = [
  "presente",
  "retardo",
  "justificado",
  "ausente",
];

export const TIMER_PRESETS = [
  { label: "Discurso", seconds: 60 },
  { label: "Moderado", seconds: 120 },
  { label: "Caucus", seconds: 300 },
  { label: "Receso", seconds: 600 },
] as const;

export function rubricAverage(scores: RubricScore[] | undefined | null): number | null {
  if (!scores || scores.length === 0) return null;
  const total = scores.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  return Math.round((total / scores.length) * 10) / 10;
}

export const VOTE_LABELS: Record<ResolutionVoteRow["vote"], string> = {
  a_favor: "A favor",
  en_contra: "En contra",
  abstencion: "Abstención",
};

export const VOTE_ORDER: Array<ResolutionVoteRow["vote"]> = ["a_favor", "en_contra", "abstencion"];
