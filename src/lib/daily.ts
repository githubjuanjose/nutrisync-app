import { supabase } from './supabase';
import { getProfile, getCurrentCycle } from './api';
import { cycleDay, phaseForDay, displayPhase, computeDailyCAS, Intensity } from './cas';

export const todayISO = () => new Date().toISOString().slice(0, 10);

const INTENSITY_MAP: Record<string, Intensity> = {
  low: 'low', low_moderate: 'low', moderate: 'moderate', high: 'high', rest: 'rest',
};
const rank: Record<Intensity, number> = { rest: 0, low: 1, moderate: 2, high: 3 };

export type DailyLog = {
  date: string; mood: number | null; energy: number | null; workout_logged: string | null;
  sleep_quality: string | null; appetite: number | null; flow_level: number | null;
};

/** Sleep-quality label → 1–5 for scoring (§9.3). */
export const SLEEP_TO_SCORE: Record<string, number> = {
  'Very Poor': 1, Restless: 2, Okay: 3, Restful: 4, Deep: 5,
};

export async function getTodayLog(userId: string): Promise<DailyLog | null> {
  const { data } = await supabase
    .from('daily_logs').select('date,mood,energy,workout_logged,sleep_quality,appetite,flow_level')
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
  const day = cycleDay(cycle.last_period_start_date, new Date(), len);
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

function highestIntensity(rows: Record<string, any>[]): Intensity | null {
  let best: Intensity | null = null;
  rows.filter((r) => r.checked).forEach((r) => {
    const i = INTENSITY_MAP[(r.intensity_level as string) ?? ''] ?? null;
    if (i && (best == null || rank[i] > rank[best])) best = i;
  });
  return best;
}

/** Gather today's inputs and upsert the full CAS breakdown into daily_scores (§15). */
export async function recomputeCAS(userId: string) {
  const [ctx, profile, log] = await Promise.all([cycleCtx(userId), getProfile(userId), getTodayLog(userId)]);
  if (!ctx) return;
  const date = todayISO();

  const [{ count: nTotal }, { count: nChecked }] = await Promise.all([
    supabase.from('nutrition_checklist').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date),
    supabase.from('nutrition_checklist').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', date).eq('checked', true),
  ]);
  const { data: moveRows } = await supabase
    .from('movement_checklist').select('intensity_level,checked').eq('user_id', userId).eq('date', date);

  const fitnessIntensity = highestIntensity(moveRows ?? []);
  const gateDone = log?.mood != null && log?.energy != null;
  const nutritionDone = (nTotal ?? 0) > 0;
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
