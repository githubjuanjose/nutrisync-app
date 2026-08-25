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
import { AppState } from 'react-native';
import { supabase } from '../supabase';
import { flags } from '../flags';
import { localDayISO } from '../localDay';
import {
  ESSENTIAL_TYPES, HealthSignalRow, RawSample, SignalType,
  dedupe, suggestDailyLog, toSignalRow, DailySuggestion,
} from './mapping';
import { getConnections } from './connections';
import { hkDisponible, hkLeer } from './healthkit';

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
): { sleepMinutes: number | null; workoutMinutes: number | null; flow: string | null } {
  let sueno = 0, entreno = 0;
  let flujo: string | null = null;
  for (const f of filas) {
    const fin = f.end_ts ?? f.start_ts;
    const dia = localDayISO(new Date(fin));
    if (dia !== hoyLocal) continue;
    if (f.type === 'sleep_minutes') sueno += f.value ?? 0;
    if (f.type === 'workout') entreno += f.value ?? 0;
    if (f.type === 'menstrual_flow') {
      const texto = (f.metadata as any)?.flow_text;
      if (typeof texto === 'string') flujo = texto;
    }
  }
  return {
    sleepMinutes: sueno > 0 ? Math.round(sueno) : null,
    workoutMinutes: entreno > 0 ? Math.round(entreno) : null,
    flow: flujo,
  };
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
    const conexiones = await getConnections(userId);
    const con = conexiones.find((c) => c.provider === 'apple_health');
    if (!con || !(con.scopes ?? []).includes('write_flow')) return;
    const { hkEscribirFlujo } = await import('./healthkit');
    await hkEscribirFlujo(localDayISO(new Date()), level);
  } catch { /* silencio deliberado: reciprocidad, no dependencia */ }
}

export async function syncSaludAlAbrir(userId: string | null | undefined): Promise<ResultadoSync> {
  try {
    if (!userId || !flags.connectors) return NO_CORRIO;

    const conexiones = await getConnections(userId);
    const con = conexiones.find((c) => c.provider === 'apple_health');
    if (!con) return NO_CORRIO;
    if (!(await hkDisponible())) return NO_CORRIO;

    // Señales consentidas = scopes de la conexión (la BD manda, no la UI).
    const tipos = (con.scopes ?? []).filter((s): s is SignalType =>
      (ESSENTIAL_TYPES as string[]).includes(s) ||
      ['steps', 'active_energy', 'resting_hr', 'hrv', 'wrist_temperature'].includes(s));
    if (!tipos.length) return NO_CORRIO;

    // Ventana desde la última señal guardada (la BD es la fuente de verdad).
    const { data: ult } = await supabase.from('health_signal')
      .select('start_ts').eq('user_id', userId).eq('provider', 'apple_health')
      .order('start_ts', { ascending: false }).limit(1).maybeSingle();
    const { desdeISO, hastaISO } = ventanaDeSync(ult?.start_ts ?? null, new Date().toISOString());

    const lectura = await hkLeer(tipos, desdeISO, hastaISO);
    const filas = dedupe(
      lectura.muestras
        .map((m: RawSample) => toSignalRow('apple_health', m))
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

    // La sugerencia de HOY (solo campos vacíos — mapping.suggestDailyLog manda).
    const hoy = localDayISO(new Date());
    const resumen = resumenDeHoy(filas, hoy);
    const { data: log } = await supabase.from('daily_logs')
      .select('sleep_quality, workout_logged, flow_level')
      .eq('user_id', userId).eq('date', hoy).maybeSingle();
    const sugerencia = suggestDailyLog(resumen, log ?? null);

    return { corrio: true, subidas, sugerencia, error: lectura.ok ? undefined : lectura.error };
  } catch (e: any) {
    return { corrio: false, subidas: 0, sugerencia: null, error: e?.message ?? 'sync fallida' };
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
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) await syncSaludAlAbrir(data.user.id);
      } catch { /* el arranque de la app JAMÁS depende de esto */ }
    };
    corre();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') corre(); });
    return () => sub.remove();
  }, []);
}
