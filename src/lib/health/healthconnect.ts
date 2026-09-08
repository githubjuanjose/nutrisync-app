/**
 * UST-2026-09-08-16 · O3 — el ADAPTADOR de Health Connect (C1).
 *
 * Espejo EXACTO de healthkit.ts, con sus mismas reglas:
 *
 *   · Carga PEREZOSA y defensiva: el require vive en hcNativo.native.ts, nunca
 *     en el top de este fichero — jest, iOS y web no deben ni verlo, y en un
 *     runtime sin el binario (una OTA sobre un build anterior al 25-ago, como
 *     el 0.22.0) todo devuelve {ok:false} sin romper nada.
 *   · NUNCA lanza hacia la UI: toda función devuelve un resultado con ok/error.
 *   · Traduce SIEMPRE a RawSample (contrato de mapping.ts) — ningún tipo de
 *     Health Connect sale de aquí.
 *   · Las decisiones (qué permiso, qué escala, cuánto se durmió) NO viven aquí:
 *     viven en proveedor.ts, que es puro y tiene unitarios. Esto es fontanería.
 *
 * Todo lo que se llama está leído del .d.ts de react-native-health-connect
 * 4.1.3 INSTALADO (r24-k): getSdkStatus · initialize · requestPermission ·
 * getGrantedPermissions · readRecords · aggregateGroupByDuration · insertRecords.
 */
import { Platform } from 'react-native';
import { cargaHC } from './hcNativo';
import type { RawSample, SignalType } from './mapping';
import {
  EstadoSdk, estadoSdk, permisosHC, senalesConcedidas, RECORD_POR_SENAL,
  flujoHCaTexto, nivelAFlujoHC, minutosDormidaHC, temperaturaAbsolutaHC,
  nombreEjercicioHC, rangoHC, FUENTE_FUSIONADA_HC,
} from './proveedor';

export { FUENTE_FUSIONADA_HC };

type HCModulo = Record<string, any>;
let _hc: HCModulo | null | undefined;
let _iniciado = false;

function modulo(): HCModulo | null {
  if (_hc !== undefined) return _hc;
  if (Platform.OS !== 'android') { _hc = null; return _hc; }
  _hc = cargaHC() as HCModulo | null;   // null = runtime sin binario: apagado limpio
  return _hc;
}

/** Health Connect exige initialize() antes de cualquier llamada. Se hace una
 *  vez y se recuerda; si falla, se comporta como «no disponible». */
async function preparado(m: HCModulo): Promise<boolean> {
  if (_iniciado) return true;
  try {
    if (typeof m.initialize !== 'function') return false;
    const ok = await m.initialize();
    _iniciado = ok !== false;
    return _iniciado;
  } catch { return false; }
}

/* ── Estado del SDK (C2, D4): instalar · actualizar · listo ────────────────── */
export async function hcEstado(): Promise<EstadoSdk> {
  const m = modulo();
  if (!m || typeof m.getSdkStatus !== 'function') return 'desconocido';
  try {
    return estadoSdk(await m.getSdkStatus());
  } catch { return 'desconocido'; }
}

/** Gemelo de hkDisponible: ¿se puede leer de verdad en este teléfono? */
export async function hcDisponible(): Promise<boolean> {
  const m = modulo();
  if (!m) return false;
  if ((await hcEstado()) !== 'listo') return false;
  return preparado(m);
}

/** Abre los ajustes de Health Connect (gestionar permisos fuera de la app).
 *  La propia librería avisa de que revokeAllPermissions NO surte efecto hasta
 *  reiniciar el proceso: por eso «desconectar» es cosa NUESTRA (la conexión de
 *  la base) y aquí solo ofrecemos el camino a los ajustes del sistema. */
export function hcAbrirAjustes(): void {
  try { modulo()?.openHealthConnectSettings?.(); } catch { /* nunca rompe la UI */ }
}

/* ── Permisos ──────────────────────────────────────────────────────────────
   C3: Android SÍ dice qué concedió (a diferencia de Apple), así que se
   devuelve lo CONCEDIDO y es eso lo que se guarda en la conexión. */
export async function hcPedirPermisos(
  tipos: SignalType[],
  escribirFlujo: boolean,
): Promise<{ ok: boolean; tipos: SignalType[]; escribir: boolean; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, tipos: [], escribir: false, error: 'Health Connect no disponible en este build' };
  if (!(await preparado(m))) return { ok: false, tipos: [], escribir: false, error: 'Health Connect no se pudo iniciar' };
  try {
    if (typeof m.requestPermission !== 'function') {
      return { ok: false, tipos: [], escribir: false, error: 'requestPermission no existe en esta versión del módulo' };
    }
    const concedidos = await m.requestPermission(permisosHC(tipos, escribirFlujo));
    const r = senalesConcedidas(concedidos);
    return { ok: r.tipos.length > 0, tipos: r.tipos, escribir: r.escribir };
  } catch (e: any) {
    return { ok: false, tipos: [], escribir: false, error: e?.message ?? 'permiso rechazado' };
  }
}

/** Lo que Android tiene concedido AHORA (para pintar el estado real). */
export async function hcConcedidos(): Promise<{ tipos: SignalType[]; escribir: boolean }> {
  const m = modulo();
  if (!m || !(await preparado(m))) return { tipos: [], escribir: false };
  try {
    return senalesConcedidas(await m.getGrantedPermissions());
  } catch { return { tipos: [], escribir: false }; }
}

/* ── Lectura: ventana → RawSample[] ────────────────────────────────────────── */
const iso = (d: any): string | null => {
  const x = d instanceof Date ? d : d ? new Date(d) : null;
  return x && isFinite(+x) ? x.toISOString() : null;
};

async function registros(m: HCModulo, tipo: string, desdeISO: string, hastaISO: string): Promise<any[]> {
  if (typeof m.readRecords !== 'function') return [];
  const r = await m.readRecords(tipo, { timeRangeFilter: rangoHC(desdeISO, hastaISO), ascendingOrder: true });
  return Array.isArray(r) ? r : (r?.records ?? []);
}

export async function hcLeer(
  tipos: SignalType[],
  desdeISO: string,
  hastaISO: string,
): Promise<{ ok: boolean; muestras: RawSample[]; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, muestras: [], error: 'Health Connect no disponible' };
  if (!(await preparado(m))) return { ok: false, muestras: [], error: 'Health Connect no se pudo iniciar' };
  const out: RawSample[] = [];
  try {
    for (const t of tipos) {
      const rt = RECORD_POR_SENAL[t];
      if (!rt) continue;
      const filas = await registros(m, rt, desdeISO, hastaISO);
      for (const s of filas) {
        const fuente = s?.metadata?.dataOrigin ?? null;
        if (t === 'steps') {
          const start = iso(s.startTime); if (!start) continue;
          out.push({ type: t, value: Number(s.count ?? NaN), startISO: start, endISO: iso(s.endTime), metadata: { fuente } });
        } else if (t === 'active_energy') {
          const start = iso(s.startTime); if (!start) continue;
          out.push({ type: t, value: Number(s.energy?.inKilocalories ?? NaN), startISO: start, endISO: iso(s.endTime), metadata: { fuente } });
        } else if (t === 'sleep_minutes') {
          const start = iso(s.startTime), end = iso(s.endTime);
          if (!start || !end) continue;
          const min = minutosDormidaHC(start, end, s.stages);
          if (min <= 0) continue;                      // sesión entera despierta: no se sube
          out.push({ type: t, value: min, startISO: start, endISO: end, metadata: { fuente, tramos: s.stages?.length ?? 0 } });
        } else if (t === 'resting_hr') {
          const start = iso(s.time); if (!start) continue;
          out.push({ type: t, value: Number(s.beatsPerMinute ?? NaN), startISO: start, endISO: null, metadata: { fuente } });
        } else if (t === 'hrv') {
          const start = iso(s.time); if (!start) continue;
          // D3: RMSSD (Health Connect) y SDNN (Apple) NO son la misma medida —
          // se guarda con su origen para que nadie las compare a ciegas.
          out.push({ type: t, value: Number(s.heartRateVariabilityMillis ?? NaN), startISO: start, endISO: null,
            metadata: { fuente, medida: 'rmssd' } });
        } else if (t === 'wrist_temperature') {
          const start = iso(s.startTime); if (!start) continue;
          const abs = temperaturaAbsolutaHC(
            s.baseline?.inCelsius,
            (s.deltas ?? []).map((d: any) => d?.delta?.inCelsius),
          );
          if (abs == null) continue;                   // sin baseline no hay absoluto: no se guarda un delta disfrazado
          out.push({ type: t, value: abs, startISO: start, endISO: iso(s.endTime),
            metadata: { fuente, medida: 'skin_temperature' } });
        } else if (t === 'workout') {
          const start = iso(s.startTime), end = iso(s.endTime);
          if (!start) continue;
          const min = end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000) : 0;
          out.push({ type: t, value: Math.round(min), startISO: start, endISO: end,
            metadata: { fuente, actividad: s.exerciseType ?? null, nombre: nombreEjercicioHC(s.exerciseType, s.title) } });
        } else if (t === 'menstrual_flow') {
          const start = iso(s.time); if (!start) continue;
          out.push({ type: t, value: Number(s.flow ?? 0), startISO: start, endISO: null,
            metadata: { fuente, flow_text: flujoHCaTexto(s.flow) } });
        }
      }
    }
    return { ok: true, muestras: out };
  } catch (e: any) {
    return { ok: false, muestras: out, error: e?.message ?? 'lectura fallida' };
  }
}

/* ── Pasos por HORA, fusionados por la plataforma (gemelo de UST-09 C3) ─────
   aggregateGroupByDuration devuelve COUNT_TOTAL por tramo, ya deduplicado
   entre apps por Health Connect — igual que la estadística de HealthKit. Cada
   hora sale como UNA muestra con fuente hc_merged y la RPC pasos_por_dia v3
   la prefiere sola. */
export async function hcPasosPorHora(
  desdeISO: string,
  hastaISO: string,
): Promise<{ ok: boolean; muestras: RawSample[]; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, muestras: [], error: 'Health Connect no disponible' };
  if (!(await preparado(m))) return { ok: false, muestras: [], error: 'Health Connect no se pudo iniciar' };
  if (typeof m.aggregateGroupByDuration !== 'function') {
    return { ok: false, muestras: [], error: 'aggregateGroupByDuration no existe en esta versión del módulo' };
  }
  try {
    const grupos = await m.aggregateGroupByDuration({
      recordType: 'Steps',
      timeRangeFilter: rangoHC(desdeISO, hastaISO),
      timeRangeSlicer: { duration: 'HOURS', length: 1 },
    });
    const out: RawSample[] = [];
    for (const g of Array.isArray(grupos) ? grupos : []) {
      const v = Number(g?.result?.COUNT_TOTAL ?? NaN);
      const start = iso(g?.startTime);
      if (!start || !isFinite(v) || v <= 0) continue;
      // end_ts = fin de la hora MENOS un segundo, como en iOS: la RPC
      // pasos_por_dia atribuye la fila a la hora (y al día) de su end_ts.
      const finRaw = g?.endTime ? new Date(g.endTime) : null;
      const end = finRaw && isFinite(+finRaw) ? new Date(finRaw.getTime() - 1000).toISOString() : null;
      out.push({ type: 'steps', value: Math.round(v), startISO: start, endISO: end, metadata: { fuente: FUENTE_FUSIONADA_HC } });
    }
    return { ok: true, muestras: out };
  } catch (e: any) {
    return { ok: false, muestras: [], error: e?.message ?? 'agregación fallida' };
  }
}

/* ── Escritura (C6/D2): devolver el período a Health Connect, idempotente ─── */
export async function hcEscribirFlujo(
  diaISO: string,      // día local YYYY-MM-DD
  level: number,       // nuestro 0-3
): Promise<{ ok: boolean; saltado?: boolean; error?: string }> {
  const m = modulo();
  if (!m) return { ok: false, error: 'Health Connect no disponible' };
  if (!(await preparado(m))) return { ok: false, error: 'Health Connect no se pudo iniciar' };
  const flow = nivelAFlujoHC(level);
  // D2: el «ninguno» (0) no existe en Health Connect — no se escribe nada y no
  // es un error: es la desviación declarada y firmada.
  if (flow == null) return { ok: true, saltado: true };
  try {
    const desde = new Date(`${diaISO}T00:00:00`).toISOString();
    const hasta = new Date(`${diaISO}T23:59:59`).toISOString();
    const previas = await registros(m, 'MenstruationFlow', desde, hasta);
    if (previas.some((s: any) => Number(s?.flow) === flow)) return { ok: true, saltado: true };
    if (typeof m.insertRecords !== 'function') return { ok: false, error: 'insertRecords no existe en esta versión del módulo' };
    await m.insertRecords([{ recordType: 'MenstruationFlow', time: new Date(`${diaISO}T12:00:00`).toISOString(), flow }]);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'escritura fallida' };
  }
}
