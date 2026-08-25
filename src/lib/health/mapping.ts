/**
 * Wearables · paso 1 — el CONTRATO de datos (lógica pura, sin nativo ni red).
 *
 * Traduce lo que dan las plataformas de salud (Apple Health hoy, Health Connect
 * después) a nuestro modelo: filas de `health_signal` y sugerencias para el
 * registro diario.
 *
 * Dos decisiones de producto que gobiernan todo lo demás:
 *
 *   1. SUGERIR, NUNCA SOBRESCRIBIR. Lo que la usuaria escribe manda siempre.
 *      El reloj rellena huecos, no corrige a nadie. Si ella dijo que durmió
 *      mal y el reloj dice 8 horas, gana ella: el reloj mide tiempo en la
 *      cama, no descanso.
 *
 *   2. LEER POCO Y EXPLICAR POR QUÉ. Cada señal que pedimos tiene que tener un
 *      uso concreto en la app. Pedir permisos "por si acaso" es lo que hace que
 *      la gente diga que no a todo.
 */

import type { Intensity } from '../cas';

/* ── Qué leemos y para qué ─────────────────────────────────────────────────
   El campo `porque` no es documentación: es el texto que se le enseña a la
   usuaria en la pantalla de permisos. Si no sabemos escribirlo, no lo pedimos. */
export type SignalType =
  | 'steps' | 'active_energy' | 'sleep_minutes' | 'resting_hr'
  | 'hrv' | 'wrist_temperature' | 'workout' | 'menstrual_flow';

export type SignalSpec = {
  type: SignalType;
  unit: 'count' | 'kcal' | 'min' | 'bpm' | 'ms' | 'celsius' | 'level';
  porque: string;
  /** Sin esto la app funciona igual; con esto funciona mejor. */
  esencial: boolean;
};

export const SIGNALS: SignalSpec[] = [
  { type: 'sleep_minutes',     unit: 'min',     esencial: true,
    porque: 'Rellena tu descanso del día sin que lo teclees.' },
  { type: 'workout',           unit: 'min',     esencial: true,
    porque: 'Marca el movimiento que ya has hecho en tu anillo del día.' },
  { type: 'active_energy',     unit: 'kcal',    esencial: false,
    porque: 'Ajusta las recomendaciones de nutrición a lo que gastas de verdad.' },
  { type: 'steps',             unit: 'count',   esencial: false,
    porque: 'Distingue un día activo de uno sedentario.' },
  { type: 'resting_hr',        unit: 'bpm',     esencial: false,
    porque: 'Señal de recuperación: sube cuando el cuerpo está pidiendo descanso.' },
  { type: 'hrv',               unit: 'ms',      esencial: false,
    porque: 'Acompaña a la fase del ciclo y ayuda a decidir intensidad.' },
  { type: 'wrist_temperature', unit: 'celsius', esencial: false,
    porque: 'La subida tras la ovulación confirma en qué fase estás.' },
  { type: 'menstrual_flow',    unit: 'level',   esencial: true,
    porque: 'Si ya registras tu periodo en Salud, no lo repites aquí.' },
];

export const signalSpec = (t: SignalType): SignalSpec | undefined =>
  SIGNALS.find(s => s.type === t);

/** Lo mínimo con lo que la integración aporta algo. El resto es opcional. */
export const ESSENTIAL_TYPES: SignalType[] = SIGNALS.filter(s => s.esencial).map(s => s.type);

/* ── Una muestra de la plataforma → una fila de health_signal ─────────────── */
export type RawSample = {
  type: SignalType;
  value: number | null;
  startISO: string;
  endISO?: string | null;
  metadata?: Record<string, unknown>;
};

export type HealthSignalRow = {
  provider: string;
  type: SignalType;
  value: number | null;
  unit: string;
  start_ts: string;
  end_ts: string | null;
  metadata: Record<string, unknown>;
};

export function toSignalRow(provider: string, s: RawSample): HealthSignalRow | null {
  const spec = signalSpec(s.type);
  if (!spec) return null;                       // tipo desconocido = se descarta, no se inventa
  if (s.value == null || !isFinite(s.value)) return null;
  if (!s.startISO) return null;
  return {
    provider,
    type: s.type,
    value: s.value,
    unit: spec.unit,
    start_ts: s.startISO,
    end_ts: s.endISO ?? null,
    metadata: s.metadata ?? {},
  };
}

/** Espejo EXACTO del índice único de la tabla: (user_id, provider, type, start_ts).
 *  Sirve para no reenviar lo ya enviado; la BD es la que manda de verdad. */
export const dedupeKey = (r: HealthSignalRow) => `${r.provider}|${r.type}|${r.start_ts}`;

export function dedupe(rows: HealthSignalRow[]): HealthSignalRow[] {
  const vistos = new Set<string>();
  const out: HealthSignalRow[] = [];
  for (const r of rows) {
    const k = dedupeKey(r);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(r);
  }
  return out;
}

/* ── Sueño: minutos → la etiqueta que ya usa el registro diario ────────────
   Nuestro modelo guarda 'Very Poor'…'Deep' y lo convierte a 1-5 para el CAS.
   El reloj mide DURACIÓN, no calidad, así que esto es una sugerencia honesta
   basada solo en cuánto se ha dormido. */
export type SleepLabel = 'Very Poor' | 'Restless' | 'Okay' | 'Restful' | 'Deep';

export function sleepMinutesToLabel(min: number | null | undefined): SleepLabel | null {
  if (min == null || !isFinite(min) || min <= 0) return null;
  if (min < 240) return 'Very Poor';   // menos de 4 h
  if (min < 330) return 'Restless';    // 4 – 5,5 h
  if (min < 420) return 'Okay';        // 5,5 – 7 h
  if (min < 510) return 'Restful';     // 7 – 8,5 h
  return 'Deep';                       // 8,5 h o más
}

/* ── Entrenamiento → intensidad del anillo ────────────────────────────────
   Reutiliza el vocabulario que ya existe en daily.ts. Si la plataforma no dice
   nada útil, devolvemos el respaldo declarado, nunca null silencioso
   (lección r12-b4: el valor por defecto es una elección). */
const WORKOUT_HIGH  = /hiit|sprint|interval|jump|plyo|boxing|kickbox/i;
const WORKOUT_MOD   = /run|correr|cycl|bike|bici|swim|nataci|row|rem|strength|fuerza|weight|elliptical|dance|baile|hike|senderis/i;
const WORKOUT_LOW   = /yoga|pilates|barre|walk|camin|stretch|estira|mobility|movilidad|tai|core|breath/i;
const WORKOUT_REST  = /mindful|medit|rest|descanso|recovery|recuper/i;

export function workoutToIntensity(
  nombre?: string | null,
  minutos?: number | null,
): Intensity {
  const n = (nombre ?? '').trim();
  if (WORKOUT_REST.test(n)) return 'rest';
  if (WORKOUT_HIGH.test(n)) return 'high';
  if (WORKOUT_LOW.test(n))  return 'low';
  if (WORKOUT_MOD.test(n))  return 'moderate';
  // sin nombre reconocible, decide la duración — mejor que no decidir
  const m = minutos ?? 0;
  if (m >= 45) return 'moderate';
  if (m > 0)   return 'low';
  return 'low';
}

/* ── Flujo menstrual: escala de la plataforma → la nuestra (0-4) ───────────
   Apple: unspecified|light|medium|heavy|none · Health Connect: light|medium|heavy
   Guardamos 0 = ninguno … 3 = abundante; 'unspecified' NO se convierte en un
   número inventado: se queda como null y lo confirma la usuaria. */
export function flowToLevel(raw?: string | null): number | null {
  switch ((raw ?? '').toLowerCase()) {
    case 'none':   return 0;
    case 'light':  return 1;
    case 'medium': return 2;
    case 'heavy':  return 3;
    default:       return null;   // incluye 'unspecified'
  }
}

/* ── La regla de oro: sugerir sin pisar ────────────────────────────────────
   Devuelve SOLO los campos que están vacíos en el registro de la usuaria.
   Si ya escribió algo, ese campo ni aparece en la propuesta. */
export type DailySuggestion = {
  sleep_quality?: SleepLabel;
  workout_logged?: boolean;
  flow_level?: number;
};

export type ExistingLog = {
  sleep_quality?: string | null;
  /** En la tabla real es el NOMBRE del entreno (string) — aquí solo importa si está vacío. */
  workout_logged?: boolean | string | null;
  flow_level?: number | null;
} | null;

export function suggestDailyLog(
  senales: { sleepMinutes?: number | null; workoutMinutes?: number | null; flow?: string | null },
  actual: ExistingLog,
): DailySuggestion {
  const s: DailySuggestion = {};

  if (actual?.sleep_quality == null) {
    const label = sleepMinutesToLabel(senales.sleepMinutes);
    if (label) s.sleep_quality = label;
  }
  if (actual?.workout_logged == null && (senales.workoutMinutes ?? 0) > 0) {
    s.workout_logged = true;
  }
  if (actual?.flow_level == null) {
    const lvl = flowToLevel(senales.flow);
    if (lvl != null) s.flow_level = lvl;
  }
  return s;
}

/** ¿Hay algo que proponer? Sirve para no enseñar una tarjeta vacía. */
export const haySugerencia = (s: DailySuggestion) => Object.keys(s).length > 0;
