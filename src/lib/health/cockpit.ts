/**
 * Cockpit de actividad (r24-o) — pasos acumulados por periodo.
 *
 * Toda la lógica es PURA (r11c-2): recibe filas ya normalizadas a {dayISO,value}
 * y devuelve los totales por bucket. El IO (leer health_signal, ciclo y fase)
 * vive en cargarCockpitPasos, que solo compone piezas probadas.
 *
 * Días SIEMPRE locales (NS-0010): el bucket de un paso lo decide su día local,
 * jamás el de Greenwich — quien llama pasa dayISO ya en local (localDayISO).
 */
import { supabase } from '../supabase';
import { localDayISO } from '../localDay';
import type { HealthSignalRow } from './mapping';
import { phaseForDay } from '../cas';

export type BucketPasos = 'hoy' | 'ciclo' | 'fase' | 'mes' | 'trimestre' | 'ytd' | 'total';
export type PasosCockpit = Record<BucketPasos, number>;

/** Familia de fase: daily_scores guarda granular (early_luteal, late_luteal…);
 *  el badge/recs usan la gruesa (luteal). Comparamos por familia para que
 *  «This phase» sume TODOS los días de la fase actual, no solo el sub-tramo.
 *  r24-q: sin esto, late_luteal !== luteal → fase siempre 0. */
export function familiaFase(s: string | null | undefined): string | null {
  if (!s) return null;
  const x = s.toLowerCase();
  if (x.includes('menstru')) return 'menstrual';
  if (x.includes('ovulat') || x.includes('ovulac')) return 'ovulatory';
  if (x.includes('luteal') || x.includes('lutea')) return 'luteal';
  if (x.includes('follic') || x.includes('folic')) return 'follicular';
  return x;
}

/** Inicio del trimestre natural (Q1 ene, Q2 abr, Q3 jul, Q4 oct) en ISO YYYY-MM-DD. */
export function inicioTrimestreISO(hoyISO: string): string {
  const [y, m] = hoyISO.split('-').map(Number);
  const primerMesQ = Math.floor((m - 1) / 3) * 3 + 1; // 1,4,7,10
  return `${y}-${String(primerMesQ).padStart(2, '0')}-01`;
}

/** PURO · suma los pasos de cada bucket. Compara días como texto ISO (ordenable). */
export function agregaPasos(
  filas: { dayISO: string; value: number }[],
  hoyISO: string,
  cicloDesdeISO: string | null,
  diasFase: Set<string> | null,
): PasosCockpit {
  const mesDesde = `${hoyISO.slice(0, 7)}-01`;
  const triDesde = inicioTrimestreISO(hoyISO);
  const ytdDesde = `${hoyISO.slice(0, 4)}-01-01`;
  const out: PasosCockpit = { hoy: 0, ciclo: 0, fase: 0, mes: 0, trimestre: 0, ytd: 0, total: 0 };
  for (const f of filas) {
    const v = f.value; if (!(v > 0)) continue;
    const d = f.dayISO;
    out.total += v;
    if (d <= hoyISO && d >= ytdDesde) out.ytd += v;
    if (d <= hoyISO && d >= triDesde) out.trimestre += v;
    if (d <= hoyISO && d >= mesDesde) out.mes += v;
    if (cicloDesdeISO && d <= hoyISO && d >= cicloDesdeISO) out.ciclo += v;
    if (diasFase && diasFase.has(d)) out.fase += v;
    if (d === hoyISO) out.hoy += v;
  }
  // Redondeo final (los pasos son enteros; evitamos flotantes acumulados).
  (Object.keys(out) as BucketPasos[]).forEach((k) => { out[k] = Math.round(out[k]); });
  return out;
}

/** Día de inicio del ciclo en curso a partir del cycle_day de hoy (día 1 = inicio). */
export function inicioCicloISO(hoyISO: string, cycleDay: number | null | undefined): string | null {
  if (!cycleDay || cycleDay < 1) return null;
  const d = new Date(`${hoyISO}T00:00:00`);
  d.setDate(d.getDate() - (cycleDay - 1));
  return localDayISO(d);
}

/** Días (ISO local) del ciclo en curso que pertenecen a la MISMA familia de fase que hoy.
 *  7-sep (sonda sobre la base, cuenta de Isabel): 15 días con pasos y solo 2 con fila en
 *  daily_scores, porque esa tabla se escribe el día que la usuaria registra ánimo y energía.
 *  Leer la fase de ahí hacía que «This phase» sumara solo los días con check-in — para quien
 *  no lo hace, 0 aunque camine 20.000 pasos. La fase de un día es una función del ciclo
 *  (inicio + número de día), no de si esa mañana se abrió la app: se calcula, no se consulta. */
export function diasDeFase(
  hoyISO: string,
  cycleDay: number | null | undefined,
  cycleLen: number | null | undefined,
  faseActual: string | null | undefined,
): Set<string> | null {
  if (!cycleDay || cycleDay < 1 || !faseActual) return null;
  const len = cycleLen && cycleLen >= 15 ? cycleLen : 28;   // fuera de rango → ciclo estándar
  const fa = familiaFase(faseActual);
  const out = new Set<string>();
  const d = new Date(`${hoyISO}T00:00:00`);
  for (let n = cycleDay; n >= 1; n--) {
    if (familiaFase(phaseForDay(n, len)) === fa) {
      out.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    d.setDate(d.getDate() - 1);
  }
  return out;
}

/** IO fino · lee pasos (health_signal) y agrega; la fase por día se CALCULA del ciclo.
 *  Jamás lanza: ante cualquier fallo devuelve ceros (la tarjeta cae a «—»). */
export async function cargarCockpitPasos(
  userId: string | null | undefined,
  cycleDay: number | null | undefined,
  faseActual: string | null | undefined,
  cycleLen: number | null | undefined = 28,
): Promise<PasosCockpit | null> {
  try {
    if (!userId) return null;
    const hoy = localDayISO(new Date());
    // Ventana generosa (piloto): 2 años cubre total/YTD/trimestre/mes/ciclo.
    const desde = new Date(); desde.setFullYear(desde.getFullYear() - 2);
    const { data } = await supabase.from('health_signal')
      .select('type,value,start_ts,end_ts')
      .eq('user_id', userId).eq('type', 'steps')
      .gte('start_ts', desde.toISOString());
    const filas = ((data as HealthSignalRow[]) ?? []).map((r) => ({
      dayISO: localDayISO(new Date(r.end_ts ?? r.start_ts)), value: Number(r.value ?? 0),
    }));

    const cicloDesde = inicioCicloISO(hoy, cycleDay);

    const diasFase = diasDeFase(hoy, cycleDay, cycleLen, faseActual);

    return agregaPasos(filas, hoy, cicloDesde, diasFase);
  } catch { return null; }
}
