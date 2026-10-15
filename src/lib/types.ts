export type AttendanceStatus = "presente" | "ausente" | "justificado" | "retardo";
export type SanctionType = "amonestacion" | "advertencia" | "disciplina";
export type TimerMode = "countdown" | "countup";

export type Committee = {
  id: string;
  code: string;
  sigla: string;
  name: string;
  topic: string | null;
  accent: string;
  sort_order: number;
  active_session_id: string | null;
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

/** Criterios de la rúbrica — editable en este archivo. */
export const RUBRIC_CRITERIA = [
  { key: "participacion", label: "Participación", hint: "Intervenciones y aportes al debate" },
  { key: "argumentacion", label: "Argumentación", hint: "Solidez de los argumentos y fuentes citadas" },
  { key: "postura", label: "Postura diplomática", hint: "Apego a la política exterior de la delegación" },
  { key: "colaboracion", label: "Colaboración y forma", hint: "Bloques de trabajo, cortesía y protocolo" },
] as const;

export const RUBRIC_SCALE = { min: 1, max: 10 } as const;

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
};

export const SANCTION_ORDER: SanctionType[] = ["amonestacion", "advertencia", "disciplina"];

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
