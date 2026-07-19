/**
 * Zona horaria única de la aplicación: Bogotá (Colombia, UTC-5, sin DST).
 * Todos los cálculos de "hoy", "por hora" y "por día" deben usar estos helpers
 * para no depender del huso del navegador.
 */
export const APP_TZ = 'America/Bogota';

/** Devuelve las "partes" (año, mes, día, hora, minuto, segundo) de una fecha en Bogotá. */
function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== 'literal') out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour === '24' ? '0' : out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

/** YYYY-MM-DD del día de Bogotá al que pertenece la fecha dada. */
export function bogotaDateKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = parts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Hora (0-23) del reloj de Bogotá para la fecha dada. */
export function bogotaHour(date: Date | string = new Date()): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return parts(d).hour;
}

/** HH:mm de Bogotá para la fecha dada. */
export function bogotaTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = parts(d);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** ¿La fecha cae en el mismo día calendario de Bogotá que `ref`? */
export function isSameBogotaDay(date: Date | string, ref: Date | string = new Date()): boolean {
  return bogotaDateKey(date) === bogotaDateKey(ref);
}

/** ¿La fecha cae "hoy" según Bogotá? */
export function isTodayBogota(date: Date | string): boolean {
  return isSameBogotaDay(date, new Date());
}
