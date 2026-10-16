// Toda la app es de San Luis Potosí: fijamos la zona para que las horas no
// dependan de la zona del servidor (Vercel corre en UTC).
const TIME_ZONE = "America/Mexico_City";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function formatLongDate(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  const text = dateFormatter.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(`${value}T12:00:00`));
}

export function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

export function formatDateTime(value: string) {
  return `${shortDateFormatter.format(new Date(value))} · ${timeFormatter.format(new Date(value))}`;
}

/** 65_000 → "1:05" ; 3_725_000 → "1:02:05" */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "5" o "5.3" sin ceros sobrantes */
export function formatScore(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
