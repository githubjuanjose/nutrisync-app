/**
 * NS-0010 (r14, 6-ago): el día que vive la usuaria, no el de Greenwich.
 * `toISOString()` corta el día UTC: un desayuno a las 7:30 en UTC+8 caía en
 * "ayer" y desaparecía de la lista de hoy al llegar la comida. TODA clave de
 * día (logs, checklists, calendario, rachas, DOB) sale de aquí.
 * Pura a propósito (regla r11c-2): acepta cualquier objeto con la cara de Date.
 */
type DateLike = Pick<Date, 'getFullYear' | 'getMonth' | 'getDate'>;

export function localDayISO(d: DateLike = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
