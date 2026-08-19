import { supabase } from './supabase';
import { getProfile, getCurrentCycle } from './api';
import { cycleDay, cycleDayActual, phaseForDay, displayPhase, computeDailyCAS, Intensity } from './cas';

import { localDayISO } from './localDay';
export const todayISO = () => localDayISO();   // NS-0010: día LOCAL, no UTC

/* r12-b1 (bug Pilar, 4-ago): el catálogo trae intensidades COMPUESTAS
   ("Moderate-High" ×8, "Low-Mid" ×4, "Low-Moderate" ×7, "Restorative…") que no
   casaban con este mapa → highestIntensity devolvía null y el componente de
   MOVIMIENTO se quedaba en 0 aunque hubiera entreno registrado. Ahora la
   clasificación es por contenido, tomando SIEMPRE el nivel más alto presente
   (un "Moderate-High" cuenta como high). Cubierto por tests en cas.test.ts. */
const INTENSITY_MAP: Record<string, Intensity> = {
  low: 'low', low_moderate: 'low', moderate: 'moderate', high: 'high', rest: 'rest',
};
export function normalizeIntensity(raw?: string | null): Intensity | null {
  const s = String(raw ?? '').toLowerCase();
  if (!s.trim()) return null;
  const direct = INTENSITY_MAP[s.replace(/[^a-z]+/g, '_')];
  if (direct) return direct;
  if (/high|vigorous|intens/.test(s)) return 'high';          // moderate-high, high-intensity…
  if (/moder|mid|medium/.test(s)) return 'moderate';          // low-mid, moderates training…
  if (/rest|restor|yin|recover/.test(s)) return 'rest';       // restorative yoga, rest day…
  if (/low|light|gentle|easy|walk/.test(s)) return 'low';
  return null;
}
/* r12-b4 (bug Pilar/Juanjo, 4-ago · 2ª vuelta): con "strength training" el anillo
   seguía a 0. Causa: varios ítems del catálogo NO traen intensidad (la ficha
   enseña "Most Recommended" en su lugar) → intensity_level se guardaba null y
   la intensidad quedaba FUERA justo en el caso por defecto. Regla nueva: si el
   ítem no declara intensidad, manda su CATEGORÍA. Nunca se pierde el registro. */
const CATEGORY_DEFAULT: [RegExp, Intensity][] = [
  [/hiit|sprint|tabata|plyo/, 'high'],
  [/strength|fuerza|resistance|weight|pesas|gym/, 'moderate'],
  [/cardio|run|correr|bike|cycl|swim|nataci/, 'moderate'],
  [/yoga|pilates|mobility|movilidad|stretch|estira|barre|walk|camin/, 'low'],
  [/rest|descanso|recovery|recuper|restor/, 'rest'],
  [/other|otro|otras/, 'low'],                 // registro propio: cuenta, sin sobrevender
];
export function categoryIntensity(cat?: string | null): Intensity | null {
  const s = String(cat ?? '').toLowerCase();
  if (!s.trim()) return null;
  for (const [re, v] of CATEGORY_DEFAULT) if (re.test(s)) return v;
  return null;
}
/** Intensidad efectiva de una fila del checklist: la suya o, si no, la de su categoría. */
export function rowIntensity(row: { intensity_level?: string | null; category_tag?: string | null }): Intensity | null {
  return normalizeIntensity(row.intensity_level) ?? categoryIntensity(row.category_tag);
}
const rank: Record<Intensity, number> = { rest: 0, low: 1, moderate: 2, high: 3 };

export type DailyLog = {
  date: string; mood: number | null; energy: number | null; workout_logged: string | null;
  sleep_quality: string | null; appetite: number | null; flow_level: number | null;
  // R4-F10: rich Edit-Period fields — selected so reopening the screen can prefill
  mood_state?: string[] | null; pain_symptoms?: string[] | null;
  digestion_symptoms?: string[] | null; cravings?: string[] | null;
  skin_symptoms?: string[] | null; libido?: number | null;
  sex_logged?: string | null; period_notes?: string | null;
};

/** Sleep-quality label → 1–5 for scoring (§9.3). */
export const SLEEP_TO_SCORE: Record<string, number> = {
  'Very Poor': 1, Restless: 2, Okay: 3, Restful: 4, Deep: 5,
};

export async function getTodayLog(userId: string): Promise<DailyLog | null> {
  // R4-F10: include the rich fields — without them the Edit Period screen's
  // prefill always came back empty and "symptoms don't save" (they saved, but
  // were never reloaded).
  const { data } = await supabase
    .from('daily_logs')
    .select('date,mood,energy,workout_logged,sleep_quality,appetite,flow_level,mood_state,pain_symptoms,digestion_symptoms,cravings,skin_symptoms,libido,sex_logged,period_notes')
    .eq('user_id', userId).eq('date', todayISO()).maybeSingle();
  return (data as DailyLog) ?? null;
}

/** Edit Period rich log (§9) → daily_logs. Feeds C2 sleep + appetite. */
export async function saveEditPeriod(userId: string, d: {
  flow_level?: number | null;
  mood_state?: string[]; pain_symptoms?: string[]; digestion_symptoms?: string[];
  cravings?: string[]; skin_symptoms?: string[];
  sleep_quality?: string | null; libido?: number | null; sex_logged?: string | null;
  period_notes?: string | null;
}) {
  const ctx = await cycleCtx(userId);
  // Appetite (§9.4): derived from cravings intensity.
  const cr = d.cravings ?? [];
  const appetite = cr.includes('Strong') ? 4 : cr.length ? 3 : null;
  const { error } = await supabase.from('daily_logs').upsert(
    {
      user_id: userId, date: todayISO(), cycle_day: ctx?.day, phase: ctx?.phase5,
      flow_level: d.flow_level ?? null, mood_state: d.mood_state ?? [],
      pain_symptoms: d.pain_symptoms ?? [], digestion_symptoms: d.digestion_symptoms ?? [],
      cravings: cr, skin_symptoms: d.skin_symptoms ?? [],
      sleep_quality: d.sleep_quality ?? null, appetite, libido: d.libido ?? null,
      sex_logged: d.sex_logged ?? null, period_notes: d.period_notes ?? null,
    },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
  await recomputeCAS(userId);
}

/** Resolve today's cycle context (day + 5-phase + display phase). */
async function cycleCtx(userId: string) {
  const cycle = await getCurrentCycle(userId);
  if (!cycle) return null;
  const len = cycle.cycle_length ?? 28;
  const day = cycleDayActual(cycle.last_period_start_date, new Date());
  const phase5 = phaseForDay(day, len, cycle.period_duration ?? 5);
  return { day, phase5, phaseUI: displayPhase(phase5), len };
}

/** Morning gate → daily_logs (upsert on user_id+date). */
export async function saveMoodEnergy(userId: string, mood: number, energy: number) {
  const ctx = await cycleCtx(userId);
  const { error } = await supabase.from('daily_logs').upsert(
    { user_id: userId, date: todayISO(), mood, energy, cycle_day: ctx?.day, phase: ctx?.phase5 },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
  await recomputeCAS(userId);
}

export async function saveMeal(userId: string, description: string) {
  const ctx = await cycleCtx(userId);
  const { error } = await supabase.from('meal_logs').insert({
    user_id: userId, date: todayISO(), description, cycle_day: ctx?.day, phase: ctx?.phase5,
  });
  if (error) throw error;
}

/** Replace today's checklist rows for a table, then recompute. */
export async function saveChecklist(
  userId: string,
  table: 'nutrition_checklist' | 'movement_checklist',
  rows: Record<string, any>[]
) {
  const date = todayISO();
  await supabase.from(table).delete().eq('user_id', userId).eq('date', date);
  if (rows.length) {
    const { error } = await supabase.from(table).insert(rows.map((r) => ({ ...r, user_id: userId, date })));
    if (error) throw error;
  }
  // reflect the highest checked movement intensity into daily_logs for CAS
  if (table === 'movement_checklist') {
    const top = highestIntensity(rows);
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date, workout_logged: top ?? null },
      { onConflict: 'user_id,date' }
    );
  }
  await recomputeCAS(userId);
}

export function highestIntensity(rows: Record<string, any>[]): Intensity | null {
  let best: Intensity | null = null;
  rows.filter((r) => r.checked).forEach((r) => {
    const i = rowIntensity(r as any);
    if (i && (best == null || rank[i] > rank[best])) best = i;
  });
  return best;
}

/** Gather today's inputs and upsert the full CAS breakdown into daily_scores (§15). */
export async function recomputeCAS(userId: string) {
  const [ctx, profile, log] = await Promise.all([cycleCtx(userId), getProfile(userId), getTodayLog(userId)]);
  if (!ctx) return;
  const date = todayISO();

  // F3 (UST-03): la ventana del DIA es la LOCAL de la usuaria (NS-0010) —
  // los límites los pone el móvil, el servidor solo filtra confirmed_at.
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);

  const [{ count: nTotal }, { count: nChecked }, alinDia, { count: nMeals }] = await Promise.all([
    supabase.from('nutrition_checklist').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date),
    supabase.from('nutrition_checklist').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date).eq('checked', true),
    supabase.rpc('ns_alineacion_del_dia', { p_desde: d0.toISOString(), p_hasta: d1.toISOString() })
      .then((r) => r, () => ({ data: null } as any)),   // sin RPC no hay tiers, jamás rompe
    supabase.from('meal_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date),
  ]);
  const dayTiers: string[] = Array.isArray((alinDia?.data as any)?.tiers)
    ? ((alinDia!.data as any).tiers as any[]).map((t) => String(t?.tier ?? '')).filter(Boolean)
    : [];
  const { data: moveRows } = await supabase
    // r12-b4: la CATEGORÍA es el respaldo cuando el ítem no declara intensidad
    .from('movement_checklist').select('intensity_level,category_tag,checked').eq('user_id', userId).eq('date', date);

  const fitnessIntensity = highestIntensity(moveRows ?? []);
  const gateDone = log?.mood != null && log?.energy != null;
  // F1/F2 (UST-03): una comida registrada (manual O por foto, vía meal_logs)
  // también cuenta como «nutrición hecha» para la constancia del día.
  const nutritionDone = (nTotal ?? 0) > 0 || (nMeals ?? 0) > 0;
  const movementDone = (moveRows?.length ?? 0) > 0;
  const logsCompleted = [gateDone, nutritionDone, movementDone].filter(Boolean).length;

  const cas = computeDailyCAS({
    phase: ctx.phase5,
    hasPeriodStart: true,
    contraception: profile?.contraception_status === 'yes_currently',
    energy: log?.energy ?? null,
    mood: log?.mood ?? null,
    performanceIntensity: fitnessIntensity,
    nutritionChecked: nChecked ?? 0,
    nutritionTotal: nTotal ?? 0,
    dayTiers,
    fitnessIntensity,
    logsCompleted,
  });

  await supabase.from('daily_scores').upsert(
    {
      user_id: userId, date, cycle_day: ctx.day, phase: ctx.phase5,
      cas_total: cas.total,
      component_1_phase_confidence: cas.c1, component_2_biomarkers: cas.c2,
      component_3_nutrition: cas.c3, component_4_fitness: cas.c4, component_5_logging: cas.c5,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  );
}

export async function getTodayScore(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('daily_scores').select('cas_total').eq('user_id', userId).eq('date', todayISO()).maybeSingle();
  return data ? Number((data as any).cas_total) : null;
}

export type ScoreDetail = {
  cas_total: number; c1: number; c2: number; c3: number; c4: number; c5: number;
};
export async function getScoreDetail(userId: string): Promise<ScoreDetail | null> {
  const { data } = await supabase
    .from('daily_scores')
    .select('cas_total,component_1_phase_confidence,component_2_biomarkers,component_3_nutrition,component_4_fitness,component_5_logging')
    .eq('user_id', userId).eq('date', todayISO()).maybeSingle();
  if (!data) return null;
  const d = data as any;
  return {
    cas_total: Number(d.cas_total), c1: Number(d.component_1_phase_confidence), c2: Number(d.component_2_biomarkers),
    c3: Number(d.component_3_nutrition), c4: Number(d.component_4_fitness), c5: Number(d.component_5_logging),
  };
}
