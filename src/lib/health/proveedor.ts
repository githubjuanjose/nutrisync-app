/**
 * UST-2026-09-08-16 · O3 — las REGLAS de Health Connect, puras (C1, C4).
 *
 * Todo lo que traduce entre «nuestro modelo» y Health Connect vive aquí, SIN
 * IO y con unitarios: qué tipo de registro corresponde a cada señal, qué
 * permisos se piden, qué se guarda de lo que Android concede DE VERDAD, cómo
 * se convierte el flujo, cuántos minutos se durmió y cómo se hace absoluta una
 * temperatura de piel. El adaptador (healthconnect.ts) solo compone piezas
 * probadas — el IO consume, los tests cubren (r11c-2).
 *
 * Todo lo de aquí está LEÍDO del .d.ts de react-native-health-connect 4.1.3
 * instalado (r24-k: la API de una lib nativa no se supone), no de la memoria.
 *
 * REGLA DE PARIDAD (Juanjo, 8-sep): «un desarrollo, dos superficies». La
 * diferencia entre iOS y Android se resuelve AQUÍ, en funciones puras, para
 * que las pantallas sean las mismas en los dos sistemas.
 */
import type { SignalType } from './mapping';
import type { SO } from '../plataforma';

/* ── Quién es el proveedor de salud de cada plataforma ────────────────────── */
export type ProveedorSalud = 'apple_health' | 'health_connect';

/** El proveedor NATIVO de esta plataforma, o null si no hay (web/jest).
 *  Es la pieza que rompe el cableado a Apple Salud: sync y pantallas preguntan
 *  aquí en vez de escribir 'apple_health' a mano. */
export function proveedorDePlataforma(so: SO): ProveedorSalud | null {
  if (so === 'ios') return 'apple_health';
  if (so === 'android') return 'health_connect';
  return null;
}

/** Los proveedores nativos que tienen ADAPTADOR escrito de verdad. Es lo que
 *  distingue «conectable» de «próximamente» en Dispositivos conectados: un
 *  botón sin controlador detrás es el P0 de UST-15, y Samsung Health sigue sin
 *  adaptador. Vive aquí para que exista UNA sola lista (plataforma.ts la lee). */
export const PROVEEDORES_CON_ADAPTADOR: ReadonlySet<string> = new Set(['apple_health', 'health_connect']);

/** Nombre comercial del proveedor (el que ve la usuaria). */
export function nombreProveedor(p: ProveedorSalud | string | null | undefined): string {
  return p === 'apple_health' ? 'Apple Health' : p === 'health_connect' ? 'Health Connect' : '—';
}

/* ── Estado del SDK de Health Connect (C2, D4) ─────────────────────────────
   getSdkStatus devuelve 1 SDK_UNAVAILABLE · 2 PROVIDER_UPDATE_REQUIRED ·
   3 SDK_AVAILABLE (constants.d.ts 4.1.3). Cada estado tiene su pantalla: un
   botón que no hace nada es peor que no tener botón (lección P0 de UST-15). */
export type EstadoSdk = 'listo' | 'instalar' | 'actualizar' | 'desconocido';

export function estadoSdk(n: number | null | undefined): EstadoSdk {
  switch (Number(n)) {
    case 3: return 'listo';
    case 2: return 'actualizar';
    case 1: return 'instalar';
    default: return 'desconocido';
  }
}

/** Ficha de Health Connect en Play. El parámetro `url` con el deep link de
 *  onboarding es el que Google documenta para volver a la app tras instalar. */
export const PAQUETE_HC = 'com.google.android.apps.healthdata';
export const PLAY_HC =
  `https://play.google.com/store/apps/details?id=${PAQUETE_HC}&url=healthconnect%3A%2F%2Fonboarding`;

/* ── Señal ↔ tipo de registro de Health Connect ───────────────────────────── */
export type RecordTypeHC =
  | 'Steps' | 'ActiveCaloriesBurned' | 'SleepSession' | 'RestingHeartRate'
  | 'HeartRateVariabilityRmssd' | 'SkinTemperature' | 'ExerciseSession' | 'MenstruationFlow';

/** Las OCHO señales de mapping.SIGNALS existen en Health Connect. La única
 *  que no es idéntica es la temperatura (piel vs muñeca dormida) — D3. */
export const RECORD_POR_SENAL: Record<SignalType, RecordTypeHC> = {
  steps: 'Steps',
  active_energy: 'ActiveCaloriesBurned',
  sleep_minutes: 'SleepSession',
  resting_hr: 'RestingHeartRate',
  hrv: 'HeartRateVariabilityRmssd',
  wrist_temperature: 'SkinTemperature',
  workout: 'ExerciseSession',
  menstrual_flow: 'MenstruationFlow',
};

export type PermisoHC = { accessType: 'read' | 'write'; recordType: RecordTypeHC };

/** Los permisos que se le piden a Android: lectura de lo elegido + escritura
 *  de MenstruationFlow solo si ella activó el write-back. Orden estable. */
export function permisosHC(tipos: readonly SignalType[], escribirFlujo: boolean): PermisoHC[] {
  const vistos = new Set<RecordTypeHC>();
  const out: PermisoHC[] = [];
  for (const t of tipos) {
    const rt = RECORD_POR_SENAL[t];
    if (!rt || vistos.has(rt)) continue;
    vistos.add(rt);
    out.push({ accessType: 'read', recordType: rt });
  }
  if (escribirFlujo) out.push({ accessType: 'write', recordType: 'MenstruationFlow' });
  return out;
}

/** C3 · lo que se GUARDA es lo que Android concedió, no lo que pedimos.
 *  getGrantedPermissions devuelve la lista real; aquí se traduce de vuelta a
 *  nuestras señales. Nada de conexiones optimistas (a diferencia de Apple, que
 *  por privacidad no dice qué concedió: allí seguimos registrando intención). */
export function senalesConcedidas(
  permisos: readonly { accessType?: string; recordType?: string }[] | null | undefined,
): { tipos: SignalType[]; escribir: boolean } {
  const leidos = new Set<string>();
  let escribir = false;
  for (const p of permisos ?? []) {
    if (!p || typeof p.recordType !== 'string') continue;
    if (p.accessType === 'write') {
      if (p.recordType === 'MenstruationFlow') escribir = true;
      continue;
    }
    if (p.accessType === 'read') leidos.add(p.recordType);
  }
  const tipos = (Object.keys(RECORD_POR_SENAL) as SignalType[])
    .filter((t) => leidos.has(RECORD_POR_SENAL[t]));
  return { tipos, escribir };
}

/* ── Flujo menstrual: la escala de Health Connect ──────────────────────────
   MenstruationFlow: 0 UNKNOWN · 1 LIGHT · 2 MEDIUM · 3 HEAVY (constants 4.1.3).
   Apple numera del 1 al 5 e incluye «none»; Health Connect NO tiene «ninguno».
   El 0 (UNKNOWN) se queda en null aguas abajo, igual que el «unspecified» de
   Apple: no se inventa un nivel (regla vigente de mapping.flowToLevel). */
export function flujoHCaTexto(v: number | null | undefined): string {
  switch (Number(v)) {
    case 1: return 'light';
    case 2: return 'medium';
    case 3: return 'heavy';
    default: return 'unspecified';
  }
}

/** D2 · nuestro nivel (0-3) → MenstruationFlow. El 0 («ninguno») NO tiene
 *  destino en Health Connect: se devuelve null y no se escribe nada — mejor un
 *  silencio honesto que un «leve» inventado en la app de salud de la usuaria. */
export function nivelAFlujoHC(level: number | null | undefined): number | null {
  switch (Number(level)) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    default: return null;   // incluye 0 = «ninguno» y cualquier valor fuera de rango
  }
}

/* ── Sueño: SleepStageType → minutos DORMIDA ───────────────────────────────
   0 UNKNOWN · 1 AWAKE · 2 SLEEPING · 3 OUT_OF_BED · 4 LIGHT · 5 DEEP · 6 REM.
   Cuentan 2/4/5/6 — gemelo de SUENO_DORMIDA de HealthKit (asleep + core + deep
   + REM), que también descarta «en la cama despierta». Sin stages, la sesión
   entera cuenta: Health Connect solo la registra cuando se ha dormido. */
export const SUENO_DORMIDA_HC = new Set([2, 4, 5, 6]);

export function minutosDormidaHC(
  inicioISO: string,
  finISO: string,
  stages?: readonly { startTime?: string; endTime?: string; stage?: number }[] | null,
): number {
  const dur = (a?: string | null, b?: string | null): number => {
    if (!a || !b) return 0;
    const x = new Date(a).getTime(), y = new Date(b).getTime();
    if (!isFinite(x) || !isFinite(y) || y <= x) return 0;
    return (y - x) / 60000;
  };
  if (stages && stages.length) {
    let min = 0;
    for (const s of stages) {
      if (!SUENO_DORMIDA_HC.has(Number(s?.stage))) continue;
      min += dur(s?.startTime, s?.endTime);
    }
    // Con stages pero ninguno «dormida» (toda la sesión despierta): 0, y no se sube.
    return Math.round(min);
  }
  return Math.round(dur(inicioISO, finISO));
}

/* ── Temperatura de piel → grados absolutos (D3) ───────────────────────────
   SkinTemperature da una BASELINE opcional y una lista de DELTAS. Apple da la
   temperatura de la muñeca dormida en grados absolutos. Mezclar un delta
   (+0,3) con un absoluto (36,5) en la misma columna sería mentir en silencio:
   solo se guarda cuando se puede hacer absoluta (hay baseline). Sin baseline
   se devuelve null y esa muestra no sube — desviación declarada en la UST. */
export function temperaturaAbsolutaHC(
  baselineC: number | null | undefined,
  deltasC: readonly (number | null | undefined)[] | null | undefined,
): number | null {
  const base = Number(baselineC);
  if (!isFinite(base) || base <= 0) return null;
  const ds = (deltasC ?? []).map(Number).filter((n) => isFinite(n));
  if (!ds.length) return Math.round(base * 100) / 100;
  const media = ds.reduce((a, b) => a + b, 0) / ds.length;
  return Math.round((base + media) * 100) / 100;
}

/* ── Entrenamiento: exerciseType → un nombre que ya sabemos puntuar ────────
   workoutToIntensity (mapping.ts) lee NOMBRES. Health Connect da un número.
   Se traduce solo lo que la app distingue de verdad; lo demás cae al respaldo
   por duración que ya existe (r12-b4: el valor por defecto es una elección). */
const NOMBRE_EJERCICIO: Record<number, string> = {
  8: 'biking', 9: 'biking', 10: 'boot camp interval', 11: 'boxing', 12: 'burpee jump',
  16: 'dancing', 25: 'elliptical', 36: 'hiit interval', 37: 'hiking', 40: 'jumping jack',
  41: 'jump rope', 44: 'martial arts kickboxing', 48: 'pilates', 51: 'rock climbing',
  53: 'rowing', 54: 'rowing machine', 56: 'running', 57: 'running treadmill',
  67: 'squat strength', 68: 'stair climbing', 69: 'stair climbing machine',
  70: 'strength training', 71: 'stretching', 73: 'swimming', 74: 'swimming',
  79: 'walking', 81: 'weightlifting strength', 83: 'yoga',
};

export function nombreEjercicioHC(tipo: number | null | undefined, titulo?: string | null): string | null {
  const t = (titulo ?? '').trim();
  if (t) return t;                       // lo que la usuaria puso en su app manda
  return NOMBRE_EJERCICIO[Number(tipo)] ?? null;
}

/* ── Pasos fusionados ──────────────────────────────────────────────────────
   aggregateGroupByDuration({recordType:'Steps', timeRangeSlicer:{duration:'HOURS'}})
   devuelve COUNT_TOTAL por hora YA deduplicado por la plataforma entre apps —
   gemelo exacto de la estadística de HealthKit (UST-09 C3). La RPC
   pasos_por_dia v3 prefiere la hora fusionada, así que la simetría es gratis. */
export const FUENTE_FUSIONADA_HC = 'hc_merged';
/** La etiqueta gemela de iOS (UST-09 C3). Vive aquí para que exista UNA sola
 *  definición de cada fuente fusionada — healthkit.ts la re-exporta. */
export const FUENTE_FUSIONADA_HK = 'hk_merged';

export const FUENTES_FUSIONADAS: ReadonlySet<string> = new Set([FUENTE_FUSIONADA_HK, FUENTE_FUSIONADA_HC]);

/** ¿Esta fila viene de una hora YA fusionada por la plataforma? Si la hay, las
 *  muestras crudas del mismo día no se suman (se contarían dos veces). */
export const esFusionada = (fuente: unknown): boolean =>
  typeof fuente === 'string' && FUENTES_FUSIONADAS.has(fuente);

/** El rango de Health Connect: `{operator:'between', startTime, endTime}` en
 *  ISO (base.types.d.ts). Aquí para tenerlo probado en un solo sitio. */
export function rangoHC(desdeISO: string, hastaISO: string): { operator: 'between'; startTime: string; endTime: string } {
  return { operator: 'between', startTime: desdeISO, endTime: hastaISO };
}
