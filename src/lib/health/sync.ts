/**
 * Wearables · paso 3 — SINCRONIZAR AL ABRIR (O1, UST-2026-08-24-06 F1).
 *
 * Cero background en fase 1: esto corre cuando la app se abre, y punto.
 * Lo puro (ventana, agregación de sueño, resumen del día) vive arriba con
 * unitarios; el runner de abajo es IO fino que solo compone piezas probadas.
 *
 * La regla suprema viaja intacta: suggestDailyLog (mapping.ts) solo propone
 * campos VACÍOS — si ella escribió algo, gana ella.
 */
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../supabase';
import { flags } from '../flags';
import { localDayISO } from '../localDay';
import {
  ESSENTIAL_TYPES, HealthSignalRow, RawSample, SignalType,
  dedupe, suggestDailyLog, toSignalRow, DailySuggestion,
} from './mapping';
import { getConnections } from './connections';
import { adaptadorDe, Adaptador } from './adaptador';
import { esFusionada } from './proveedor';

/* ── PURO · la ventana de lectura ──────────────────────────────────────────
   Desde la última señal guardada (con 1 día de solape: HealthKit re-escribe
   muestras recientes) o 14 días si es la primera vez. Nunca más de 14. */
export function ventanaDeSync(
  ultimoISO: string | null,
  ahoraISO: string,
  maxDias = 14,
): { desdeISO: string; hastaISO: string } {
  const ahora = new Date(ahoraISO);
  const suelo = new Date(ahora.getTime() - maxDias * 86400000);
  let desde = suelo;
  if (ultimoISO) {
    const solape = new Date(new Date(ultimoISO).getTime() - 86400000);
    if (solape > suelo) desde = solape;
  }
  return { desdeISO: desde.toISOString(), hastaISO: ahora.toISOString() };
}

/* ── PURO · UST-26 F5 · la ventana del RELLENO de historial de pasos ──────────
   Solo pasos, solo días ANTERIORES al primer día local que ya tiene horas, y como
   mucho `maxDias` hacia atrás (730 = la ventana que lee pasos_por_dia). Devuelve
   null cuando no hay nada que rellenar: sin dato previo (la sincronización normal
   aún no corrió) o con el dato más antiguo ya en el fondo de la ventana. */
export function diasARellenar(
  masAntiguoISO: string | null,
  ahoraISO: string,
  maxDias = 730,
): { desdeISO: string; hastaISO: string } | null {
  if (!masAntiguoISO) return null;
  const ahora = new Date(ahoraISO);
  const suelo = new Date(ahora.getTime() - maxDias * 86400000);
  // Corte: la medianoche LOCAL del día del dato más antiguo — ese día ya tiene horas
  // (aunque sea parcial) y un bucket diario encima lo contaría dos veces.
  const corte = new Date(masAntiguoISO);
  corte.setHours(0, 0, 0, 0);
  if (corte.getTime() - suelo.getTime() < 86400000) return null;   // menos de un día: nada que rellenar
  return { desdeISO: suelo.toISOString(), hastaISO: corte.toISOString() };
}

/* ── PURO · sueño: tramos dormida → minutos por DÍA LOCAL ──────────────────
   Una noche 23:00→07:00 pertenece al día en que DESPIERTA (regla NS-0010:
   jamás el día de Greenwich — localDayISO decide). */
export function minutosDeSuenoPorDia(
  tramos: { startISO: string; endISO?: string | null; minutos: number }[],
): Record<string, number> {
  const porDia: Record<string, number> = {};
  for (const t of tramos) {
    if (!t.minutos || t.minutos <= 0) continue;
    const fin = t.endISO ?? t.startISO;
    const dia = localDayISO(new Date(fin));
    porDia[dia] = (porDia[dia] ?? 0) + t.minutos;
  }
  return porDia;
}

/* ── PURO · el resumen que alimenta la sugerencia de HOY ─────────────────── */
export function resumenDeHoy(
  filas: HealthSignalRow[],
  hoyLocal: string,
): { sleepMinutes: number | null; workoutMinutes: number | null; flow: string | null; steps: number | null } {
  let sueno = 0, entreno = 0, pasos = 0, pasosFusionados = 0;
  let flujo: string | null = null;
  for (const f of filas) {
    const fin = f.end_ts ?? f.start_ts;
    const dia = localDayISO(new Date(fin));
    if (dia !== hoyLocal) continue;
    if (f.type === 'sleep_minutes') sueno += f.value ?? 0;
    if (f.type === 'workout') entreno += f.value ?? 0;
    if (f.type === 'steps') {                         // r24-i: la tarjeta STEPS los pinta
      // UST-09 C3: si hay horas FUSIONADAS por la plataforma, mandan ellas solas (las crudas
      // de iPhone+Watch —o de móvil+reloj en Android— se contarían dos veces). Sin
      // fusionadas, lo de antes. UST-16 C4: vale para hk_merged y para hc_merged.
      if (esFusionada((f.metadata as any)?.fuente)) pasosFusionados += f.value ?? 0;
      else pasos += f.value ?? 0;
    }
    if (f.type === 'menstrual_flow') {
      const texto = (f.metadata as any)?.flow_text;
      if (typeof texto === 'string') flujo = texto;
    }
  }
  return {
    sleepMinutes: sueno > 0 ? Math.round(sueno) : null,
    workoutMinutes: entreno > 0 ? Math.round(entreno) : null,
    flow: flujo,
    steps: pasosFusionados > 0 ? Math.round(pasosFusionados) : pasos > 0 ? Math.round(pasos) : null,
  };
}

/** r24-i · Lee de la BASE los pasos de hoy (ya sincronizados por
 *  syncSaludAlAbrir). Puro-IO, jamás lanza: la tarjeta cae a null en silencio.
 *  Devuelve null si no hay conexión, no hay dato o falla algo. */
export async function pasosDeHoy(userId: string | null | undefined): Promise<number | null> {
  try {
    if (!userId) return null;
    const desde = new Date(); desde.setDate(desde.getDate() - 1);
    const { data } = await supabase.from('health_signal')
      .select('type,value,start_ts,end_ts,metadata')
      .eq('user_id', userId).eq('type', 'steps')
      .gte('start_ts', desde.toISOString());
    const filas = (data as HealthSignalRow[]) ?? [];
    return resumenDeHoy(filas, localDayISO(new Date())).steps;
  } catch { return null; }
}

/* ── El runner: se llama al abrir la app ─────────────────────────────────── */
export type ResultadoSync = {
  corrio: boolean;             // false = algún guardián dijo que no (sin error)
  subidas: number;
  sugerencia: DailySuggestion | null;
  error?: string;
};

const NO_CORRIO: ResultadoSync = { corrio: false, subidas: 0, sugerencia: null };

/** O2 · tras guardar el período aquí, devolverlo a Salud si ella lo activó.
 *  Guardas dentro; jamás lanza (el guardado de la usuaria NUNCA depende de esto). */
export async function escribirFlujoSiProcede(
  userId: string | null | undefined,
  level: number | null | undefined,
): Promise<void> {
  try {
    if (!userId || level == null || !flags.connectors) return;
    const ad = adaptadorDe(Platform.OS);          // UST-16 C4: el proveedor de ESTA plataforma
    if (!ad) return;
    const conexiones = await getConnections(userId);
    const con = conexiones.find((c) => c.provider === ad.provider);
    if (!con || !(con.scopes ?? []).includes('write_flow')) return;
    await ad.escribirFlujo(localDayISO(new Date()), level);
  } catch { /* silencio deliberado: reciprocidad, no dependencia */ }
}

export async function syncSaludAlAbrir(userId: string | null | undefined): Promise<ResultadoSync> {
  try {
    if (!userId || !flags.connectors) return NO_CORRIO;

    // UST-16 C4 · la sincronización deja de estar cableada a Apple Salud: pregunta
    // por el proveedor de ESTA plataforma (iOS → Apple Salud · Android → Health
    // Connect). Antes, en Android, la ruta moría aquí: NO_CORRIO para siempre.
    const ad = adaptadorDe(Platform.OS);
    if (!ad) return NO_CORRIO;

    const conexiones = await getConnections(userId);
    const con = conexiones.find((c) => c.provider === ad.provider);
    if (!con) return NO_CORRIO;
    if (!(await ad.disponible())) return NO_CORRIO;

    // Señales consentidas = scopes de la conexión (la BD manda, no la UI).
    const tipos = (con.scopes ?? []).filter((s): s is SignalType =>
      (ESSENTIAL_TYPES as string[]).includes(s) ||
      ['steps', 'active_energy', 'resting_hr', 'hrv', 'wrist_temperature'].includes(s));
    if (!tipos.length) return NO_CORRIO;

    // Ventana desde la última señal guardada (la BD es la fuente de verdad).
    const { data: ult } = await supabase.from('health_signal')
      .select('start_ts').eq('user_id', userId).eq('provider', ad.provider)
      .order('start_ts', { ascending: false }).limit(1).maybeSingle();
    const { desdeISO, hastaISO } = ventanaDeSync(ult?.start_ts ?? null, new Date().toISOString());

    // UST-09 C3 (0.23.5): los PASOS ya no entran como muestras crudas (iPhone + Watch = doble
    // cuenta) sino como la estadística por HORA que HealthKit ya fusiona; el resto igual.
    const conPasos = tipos.includes('steps');
    const lectura = await ad.leer(tipos.filter((t) => t !== 'steps'), desdeISO, hastaISO);
    const filas = dedupe(
      lectura.muestras
        .map((m: RawSample) => toSignalRow(ad.provider, m))
        .filter((r): r is HealthSignalRow => r != null),
    );
    const pasosHora = conPasos ? await ad.pasosPorHora(desdeISO, hastaISO) : { ok: true, muestras: [] as RawSample[] };
    const filasPasos = dedupe(
      pasosHora.muestras
        .map((m: RawSample) => toSignalRow(ad.provider, m))
        .filter((r): r is HealthSignalRow => r != null),
    );

    // Subida en lotes; el índice único de la tabla absorbe lo repetido.
    let subidas = 0;
    for (let i = 0; i < filas.length; i += 200) {
      const lote = filas.slice(i, i + 200).map((r) => ({ ...r, user_id: userId }));
      const { error } = await supabase.from('health_signal')
        .upsert(lote, { onConflict: 'user_id,provider,type,start_ts', ignoreDuplicates: true });
      if (error) return { corrio: true, subidas, sugerencia: null, error: error.message };
      subidas += lote.length;
    }
    // Las horas fusionadas se ACTUALIZAN (la hora en curso crece; HealthKit reescribe recientes):
    // sin ignoreDuplicates, el conflicto por start_ts sobreescribe el valor.
    for (let i = 0; i < filasPasos.length; i += 200) {
      const lote = filasPasos.slice(i, i + 200).map((r) => ({ ...r, user_id: userId }));
      const { error } = await supabase.from('health_signal')
        .upsert(lote, { onConflict: 'user_id,provider,type,start_ts' });
      if (error) return { corrio: true, subidas, sugerencia: null, error: error.message };
      subidas += lote.length;
    }
    const todas = filas.concat(filasPasos);

    // UST-26 F5 · el historial de pasos, DESPUÉS de lo de hoy (y solo si los pasos están consentidos).
    if (conPasos) await rellenarHistorialPasos(userId, ad);

    // La sugerencia de HOY (solo campos vacíos — mapping.suggestDailyLog manda).
    const hoy = localDayISO(new Date());
    const resumen = resumenDeHoy(todas, hoy);
    const { data: log } = await supabase.from('daily_logs')
      .select('sleep_quality, workout_logged, flow_level')
      .eq('user_id', userId).eq('date', hoy).maybeSingle();
    const sugerencia = suggestDailyLog(resumen, log ?? null);

    return { corrio: true, subidas, sugerencia, error: lectura.ok ? (pasosHora.ok ? undefined : pasosHora.error) : lectura.error };
  } catch (e: any) {
    return { corrio: false, subidas: 0, sugerencia: null, error: e?.message ?? 'sync fallida' };
  }
}

/* ── UST-26 F5 · relleno de historial de PASOS (una vez por arranque y usuaria) ──
   Después de la sincronización normal (que sigue leyendo ≤14 días de TODAS las
   señales por horas), pide a la plataforma los pasos DIARIOS fusionados de hasta
   2 años para los días anteriores al primero que ya tiene horas y los sube en
   lotes (índice único user·provider·type·start_ts: idempotente). Jamás lanza. */
const rellenoHecho = new Set<string>();

export async function rellenarHistorialPasos(
  userId: string,
  ad: Adaptador,
  ahoraISO: string = new Date().toISOString(),
): Promise<{ corrio: boolean; subidas: number; error?: string }> {
  try {
    if (rellenoHecho.has(userId)) return { corrio: false, subidas: 0 };
    rellenoHecho.add(userId);                       // una vez por proceso, pase lo que pase
    const { data: ant } = await supabase.from('health_signal')
      .select('start_ts').eq('user_id', userId).eq('provider', ad.provider).eq('type', 'steps')
      .order('start_ts', { ascending: true }).limit(1).maybeSingle();
    const ventana = diasARellenar(ant?.start_ts ?? null, ahoraISO);
    if (!ventana) return { corrio: false, subidas: 0 };
    const r = await ad.pasosPorDia(ventana.desdeISO, ventana.hastaISO);
    if (!r.ok) return { corrio: true, subidas: 0, error: r.error };
    const filas = dedupe(r.muestras.map((m: RawSample) => toSignalRow(ad.provider, m)).filter((x): x is HealthSignalRow => x != null));
    let subidas = 0;
    for (let i = 0; i < filas.length; i += 200) {
      const lote = filas.slice(i, i + 200).map((f) => ({ ...f, user_id: userId }));
      const { error } = await supabase.from('health_signal')
        .upsert(lote, { onConflict: 'user_id,provider,type,start_ts', ignoreDuplicates: true });
      if (error) return { corrio: true, subidas, error: error.message };
      subidas += lote.length;
    }
    return { corrio: true, subidas };
  } catch (e: any) {
    return { corrio: true, subidas: 0, error: e?.message ?? 'relleno fallido' };
  }
}

/* ── Hook de App: al abrir y al volver (throttle 30 min) ─────────────────── */
const MIN_ENTRE_SYNCS_MS = 30 * 60 * 1000;

export function useSyncSalud(): void {
  const ultima = useRef(0);
  useEffect(() => {
    const corre = async () => {
      if (Date.now() - ultima.current < MIN_ENTRE_SYNCS_MS) return;
      ultima.current = Date.now();
      try {
        // r22: getSession es LOCAL (getUser era un viaje de red en cada arranque).
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid) await syncSaludAlAbrir(uid);
      } catch { /* el arranque de la app JAMÁS depende de esto */ }
    };
    corre();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') corre(); });
    return () => sub.remove();
  }, []);
}
