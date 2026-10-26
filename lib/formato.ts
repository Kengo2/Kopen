export const ZONA = "America/Guayaquil";
// Ecuador no tiene horario de verano: siempre UTC-05:00.
export const OFFSET = "-05:00";

export function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function hora(iso: string) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Fecha sin hora (YYYY-MM-DD) mostrada sin desfase de zona. */
export function dia(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** Valor para <input type="datetime-local"> a partir de un ISO. */
export function aInputLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function dinero(n: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);
}

/** Hoy en Ecuador, como YYYY-MM-DD. */
export function hoy() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Fecha corta con día de la semana: "vie 30 oct". */
export function fechaChip(iso: string) {
  return new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short" })
    .format(new Date(iso)).replace(/\./g, "");
}

/** Tarifa de Kopen: 15 USD fijos por evento, sin importar la cantidad de asistentes. */
export const TARIFA_POR_EVENTO = 15;
export function cobroEvento(_entradas?: number) {
  return TARIFA_POR_EVENTO;
}
