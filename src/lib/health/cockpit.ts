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

/** IO fino · lee pasos (health_signal) + fase por día (scores) y agrega.
 *  Jamás lanza: ante cualquier fallo devuelve ceros (la tarjeta cae a «—»). */
export async function cargarCockpitPasos(
  userId: string | null | undefined,
  cycleDay: number | null | undefined,
  faseActual: string | null | undefined,
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

    // Días de la fase actual dentro del ciclo en curso: se leen de daily_scores
    // (phase por fecha). Sin fase o sin filas → bucket de fase queda en 0.
    let diasFase: Set<string> | null = null;
    if (faseActual && cicloDesde) {
      const { data: sc } = await supabase.from('daily_scores')
        .select('date,phase').eq('user_id', userId)
        .gte('date', cicloDesde).lte('date', hoy);
      const fa = familiaFase(faseActual);
      diasFase = new Set((sc ?? [])
        .filter((r: any) => familiaFase(r.phase) === fa)
        .map((r: any) => r.date));
    }

    return agregaPasos(filas, hoy, cicloDesde, diasFase);
  } catch { return null; }
}
