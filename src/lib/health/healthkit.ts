/**
 * Wearables · paso 2 — el ADAPTADOR de Apple Health (O1 + O2, UST-2026-08-24-06).
 *
 * Única pieza que habla con @kingstinct/react-native-healthkit. Reglas:
 *
 *   · Carga PEREZOSA y defensiva: el require vive dentro de las funciones,
 *     nunca en el top del fichero — jest y Android no deben ni verlo, y en un
 *     runtime sin el módulo (OTA vieja) todo devuelve {ok:false} sin romper.
 *   · NUNCA lanza hacia la UI: toda función devuelve un resultado con ok/error.
 *   · Traduce SIEMPRE a RawSample (contrato de mapping.ts) — nada de tipos de
 *     HealthKit fuera de este fichero.
 *
 * ⚠ r18-b: las FORMAS exactas de la API v14 (Nitro) se verifican en el build
 * con dispositivo físico ANTES del What to Test. Este adaptador detecta las
 * funciones por nombre (v14/v13) y falla con mensaje claro si no las halla.
 */
import { Platform } from 'react-native';
import type { RawSample, SignalType } from './mapping';

/* ── Identificadores de HealthKit por señal ────────────────────────────── */
const CUANTITATIVAS: Partial<Record<SignalType, string>> = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  active_energy: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  resting_hr: 'HKQuantityTypeIdentifierRestingHeartRate',
  hrv: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  wrist_temperature: 'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
};
const CAT_SUENO = 'HKCategoryTypeIdentifierSleepAnalysis';
const CAT_FLUJO = 'HKCategoryTypeIdentifierMenstrualFlow';

/** Valores de HKCategoryValueSleepAnalysis que cuentan como DORMIDA
 *  (1 asleepUnspecified · 3 core · 4 deep · 5 REM; 0 = solo en la cama). */
export const SUENO_DORMIDA = new Set([1, 3, 4, 5]);

/** HKCategoryValueMenstrualFlow → texto del contrato (flowToLevel lo traduce). */
export function flujoHKaTexto(v: number): string {
  switch (v) {
    case 2: return 'light';
    case 3: return 'medium';
    case 4: return 'heavy';
    case 5: return 'none';
    default: return 'unspecified'; // 1 = unspecified → null aguas abajo
  }
}
/** Nuestro nivel (0-3) → HKCategoryValueMenstrualFlow (escritura O2). */
export function nivelAFlujoHK(level: number): number | null {
  switch (level) {
    case 0: return 5;   // none
    case 1: return 2;   // light
    case 2: return 3;   // medium
    case 3: return 4;   // heavy
    default: return null;
  }
}

/* ── Carga perezosa del módulo nativo ──────────────────────────────────── */
type HKModulo = Record<string, any>;
let _hk: HKModulo | null | undefined;

function modulo(): HKModulo | null {
  if (_hk !== undefined) return _hk;
  if (Platform.OS !== 'ios') { _hk = null; return _hk; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('@kingstinct/react-native-healthkit');
    _hk = (m?.default && typeof m.default === 'object' && Object.keys(m.default).length ? { ...m, ...m.default } : m) as HKModulo;
  } catch {
    _hk = null; // runtime sin el binario (OTA sobre build viejo): apagado limpio
  }
  return _hk;
}

/** Primera función existente de la lista — v14 y v13 nombran distinto. */
function fn(m: HKModulo, nombres: string[]): ((...a: any[]) => any) | null {
  for (const n of nombres) if (typeof m[n] === 'function') return m[n];
  return null;
}

export async function hkDisponible(): Promise<boolean> {
  const m = modulo();
  if (!m) return false;
  try {
    const f = fn(m, ['isHealthDataAvailable', 'isAvailable']);
    if (!f) return false;
    const r = await f();
    return r === true;
  } catch { return false; }
}

/* ── Permisos (F1 lectura + F2 escritura como toggle aparte) ───────────── */
export async function hkPedirPermisos(
  tipos: SignalType[],
  escribirFlujo: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, error: 'HealthKit no disponible en este build' };
  try {
    const leer: string[] = [];
    for (const t of tipos) {
      if (CUANTITATIVAS[t]) leer.push(CUANTITATIVAS[t]!);
      if (t === 'sleep_minutes') leer.push(CAT_SUENO);
      if (t === 'menstrual_flow') leer.push(CAT_FLUJO);
    }
    if (tipos.includes('workout')) leer.push('HKWorkoutTypeIdentifier');
    const escribir = escribirFlujo ? [CAT_FLUJO] : [];
    const f = fn(m, ['requestAuthorization', 'requestAuthorizationAsync']);
    if (!f) return { ok: false, error: 'requestAuthorization no existe en esta versión del módulo' };
    await f(escribir, leer);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'permiso rechazado' };
  }
}

/* ── Lectura O1: ventana → RawSample[] ─────────────────────────────────── */
async function muestrasCuantitativas(m: HKModulo, id: string, desde: Date, hasta: Date): Promise<any[]> {
  const f = fn(m, ['queryQuantitySamples', 'getQuantitySamples']);
  if (!f) return [];
  const r = await f(id, { filter: { startDate: desde, endDate: hasta }, limit: 0, ascending: true })
    .catch(() => f(id, { from: desde, to: hasta })); // forma v13
  return Array.isArray(r) ? r : (r?.samples ?? []);
}
async function muestrasCategoria(m: HKModulo, id: string, desde: Date, hasta: Date): Promise<any[]> {
  const f = fn(m, ['queryCategorySamples', 'getCategorySamples']);
  if (!f) return [];
  const r = await f(id, { filter: { startDate: desde, endDate: hasta }, limit: 0, ascending: true })
    .catch(() => f(id, { from: desde, to: hasta }));
  return Array.isArray(r) ? r : (r?.samples ?? []);
}
async function entrenamientos(m: HKModulo, desde: Date, hasta: Date): Promise<any[]> {
  const f = fn(m, ['queryWorkoutSamples', 'queryWorkouts', 'getWorkouts']);
  if (!f) return [];
  const r = await f({ filter: { startDate: desde, endDate: hasta }, limit: 0, ascending: true })
    .catch(() => f({ from: desde, to: hasta }));
  return Array.isArray(r) ? r : (r?.samples ?? r?.workouts ?? []);
}

const iso = (d: any): string | null => {
  const x = d instanceof Date ? d : d ? new Date(d) : null;
  return x && isFinite(+x) ? x.toISOString() : null;
};

/** Lee la ventana pedida y devuelve RawSample[] del contrato. */
export async function hkLeer(
  tipos: SignalType[],
  desdeISO: string,
  hastaISO: string,
): Promise<{ ok: boolean; muestras: RawSample[]; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, muestras: [], error: 'HealthKit no disponible' };
  const desde = new Date(desdeISO), hasta = new Date(hastaISO);
  const out: RawSample[] = [];
  try {
    for (const t of tipos) {
      if (CUANTITATIVAS[t]) {
        for (const s of await muestrasCuantitativas(m, CUANTITATIVAS[t]!, desde, hasta)) {
          const start = iso(s.startDate ?? s.startTime); if (!start) continue;
          out.push({ type: t, value: Number(s.quantity ?? s.value ?? NaN), startISO: start,
            endISO: iso(s.endDate ?? s.endTime), metadata: { fuente: s.sourceRevision?.source?.name ?? s.source ?? null } });
        }
      } else if (t === 'sleep_minutes') {
        for (const s of await muestrasCategoria(m, CAT_SUENO, desde, hasta)) {
          const v = Number(s.value ?? -1);
          if (!SUENO_DORMIDA.has(v)) continue;               // solo tiempo DORMIDA
          const start = iso(s.startDate ?? s.startTime), end = iso(s.endDate ?? s.endTime);
          if (!start || !end) continue;
          const min = Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
          out.push({ type: t, value: Math.round(min), startISO: start, endISO: end,
            metadata: { hk_value: v, fuente: s.sourceRevision?.source?.name ?? null } });
        }
      } else if (t === 'menstrual_flow') {
        for (const s of await muestrasCategoria(m, CAT_FLUJO, desde, hasta)) {
          const start = iso(s.startDate ?? s.startTime); if (!start) continue;
          out.push({ type: t, value: Number(s.value ?? 1), startISO: start,
            endISO: iso(s.endDate ?? s.endTime), metadata: { flow_text: flujoHKaTexto(Number(s.value ?? 1)) } });
        }
      } else if (t === 'workout') {
        for (const w of await entrenamientos(m, desde, hasta)) {
          const start = iso(w.startDate ?? w.startTime); if (!start) continue;
          const end = iso(w.endDate ?? w.endTime);
          const min = w.duration != null ? Number(w.duration) / 60
            : end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000) : 0;
          out.push({ type: t, value: Math.round(min), startISO: start, endISO: end,
            metadata: { actividad: w.workoutActivityType ?? w.activityType ?? null, nombre: w.workoutActivityName ?? null } });
        }
      }
    }
    return { ok: true, muestras: out };
  } catch (e: any) {
    return { ok: false, muestras: out, error: e?.message ?? 'lectura fallida' };
  }
}

/* ── Escritura O2: devolver el período a Salud (idempotente) ───────────── */
export async function hkEscribirFlujo(
  diaISO: string,            // día local YYYY-MM-DD
  level: number,             // nuestro 0-3
): Promise<{ ok: boolean; saltado?: boolean; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, error: 'HealthKit no disponible' };
  const hkValor = nivelAFlujoHK(level);
  if (hkValor == null) return { ok: false, error: 'nivel fuera de rango' };
  try {
    const desde = new Date(`${diaISO}T00:00:00`);
    const hasta = new Date(`${diaISO}T23:59:59`);
    // Idempotencia F2: si ya hay una muestra ese día con el mismo valor, no se duplica.
    const previas = await muestrasCategoria(m, CAT_FLUJO, desde, hasta);
    if (previas.some((s) => Number(s.value) === hkValor)) return { ok: true, saltado: true };
    const f = fn(m, ['saveCategorySample', 'save']);
    if (!f) return { ok: false, error: 'saveCategorySample no existe en esta versión del módulo' };
    const mediodia = new Date(`${diaISO}T12:00:00`);
    await f(CAT_FLUJO, hkValor, { startDate: mediodia, endDate: mediodia,
      metadata: { HKMetadataKeyMenstrualCycleStart: false } });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'escritura fallida' };
  }
}
