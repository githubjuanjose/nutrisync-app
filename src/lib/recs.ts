import { supabase } from './supabase';
import { todayISO } from './daily';

/**
 * R2-B recommendation engine client. One RPC (`ns_daily_recs`) returns the
 * user's segment plus rotated daily tips / body insights and the full
 * Nutri Basics + Movement Basics lists, already filtered for her diet,
 * conditions and goal (POs' 7-step algorithm — computed server-side so web
 * and mobile always agree).
 */

export type RecItem = { id: string; name: string; score: number; intensity?: string; notes?: string };
export type DailyRecs = {
  date: string; segment: string; phase: string; cycle_day: number; cycle_len: number;
  nutrition_tip?: { headline: string; body: string; linked_item?: string; why?: string } | null;
  movement_tip?: { headline: string; body: string; linked_item?: string; why?: string } | null;
  nutrition_insight?: { headline: string; body: string; mood_typical?: string; energy_typical?: string; flow_typical?: string; quote?: string } | null;
  movement_insight?: { headline: string; body: string; output_typical?: string; recovery_need?: string; best_for?: string; quote?: string } | null;
  food_of_the_day?: { id: string; name: string; category: string; rationale?: string } | null;
  nutri_basics?: Record<string, RecItem[]> | null;
  movement_basics?: Record<string, RecItem[]> | null;
  error?: string;
};

export async function fetchDailyRecs(): Promise<DailyRecs | null> {
  const { data, error } = await supabase.rpc('ns_daily_recs');
  if (error || !data || (data as any).error) return null;
  return data as DailyRecs;
}

/** Wireframe category order first, extra content categories after. */
const CAT_ORDER = ['Proteins', 'Vegetables', 'Grains & Carbs', 'Nuts & Seeds',
  'Fruits', 'Legumes', 'Dairy & Alternatives', 'Healthy Fats & Oils', 'Herbs, Spices & Extras'];
export function orderedCategories(map: Record<string, RecItem[]> | null | undefined): [string, RecItem[]][] {
  if (!map) return [];
  return Object.entries(map).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a[0]); const ib = CAT_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/** Today's checked item names from a checklist table. */
export async function fetchCheckedToday(userId: string, table: 'nutrition_checklist' | 'movement_checklist'): Promise<Set<string>> {
  const { data } = await supabase.from(table).select('item_name,checked')
    .eq('user_id', userId).eq('date', todayISO()).eq('checked', true);
  return new Set((data ?? []).map((r: any) => r.item_name));
}

/** Targeted single-field update on today's daily log (Body Insight quick pills). */
export async function saveQuickLog(userId: string, patch: Record<string, any>) {
  const { error } = await supabase.from('daily_logs').upsert(
    { user_id: userId, date: todayISO(), ...patch }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function getQuickLog(userId: string): Promise<{ mood: number | null; energy: number | null; flow_level: number | null; pain_symptoms: string[] }> {
  const { data } = await supabase.from('daily_logs')
    .select('mood,energy,flow_level,pain_symptoms')
    .eq('user_id', userId).eq('date', todayISO()).maybeSingle();
  const d = (data as any) ?? {};
  return { mood: d.mood ?? null, energy: d.energy ?? null, flow_level: d.flow_level ?? null, pain_symptoms: d.pain_symptoms ?? [] };
}

/** Meal logging with type (R2-C). Falls back cleanly if the column migration hasn't run. */
export async function saveMealTyped(userId: string, description: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', ctx?: { day?: number; phase?: string }) {
  const row: Record<string, any> = {
    user_id: userId, date: todayISO(), description,
    cycle_day: ctx?.day ?? null, phase: ctx?.phase ?? null, meal_type: mealType,
  };
  let { error } = await supabase.from('meal_logs').insert(row);
  if (error && /meal_type/.test(error.message)) {
    delete row.meal_type;
    ({ error } = await supabase.from('meal_logs').insert(row));
  }
  if (error) throw error;
}

export type MealRow = { id: number; date: string; description: string; meal_type: string | null; phase: string | null };
export async function fetchMealHistory(userId: string, days = 30): Promise<MealRow[]> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from('meal_logs')
    .select('id,date,description,meal_type,phase')
    .eq('user_id', userId).gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: false }).order('id', { ascending: true });
  return (data as MealRow[]) ?? [];
}

export async function countMealsToday(userId: string): Promise<number> {
  const { count } = await supabase.from('meal_logs')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', todayISO());
  return count ?? 0;
}

/** R2-D · free-text movement log (movement_logs table; falls back to no-op if the migration hasn't run). */
export async function saveMovementText(userId: string, description: string, ctx?: { day?: number; phase?: string }) {
  const { error } = await supabase.from('movement_logs').insert({
    user_id: userId, date: todayISO(), description,
    cycle_day: ctx?.day ?? null, phase: ctx?.phase ?? null,
  });
  if (error) throw error;
}

export type MovementLogRow = { id: number; date: string; description: string; phase: string | null };
export async function fetchMovementHistory(userId: string, days = 30): Promise<{ logs: MovementLogRow[]; checks: { date: string; item_name: string; category_tag: string | null; phase?: string | null }[] }> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const iso = since.toISOString().slice(0, 10);
  const [l, c] = await Promise.all([
    supabase.from('movement_logs').select('id,date,description,phase')
      .eq('user_id', userId).gte('date', iso).order('date', { ascending: false }),
    supabase.from('movement_checklist').select('date,item_name,category_tag,phase')
      .eq('user_id', userId).gte('date', iso).eq('checked', true).order('date', { ascending: false }),
  ]);
  return { logs: (l.data as MovementLogRow[]) ?? [], checks: (c.data as any[]) ?? [] };
}

/** Simple food search over the content DB (barcode scan is a future feature). */
export async function searchFoods(q: string): Promise<{ id: string; name: string; category: string }[]> {
  if (!q.trim()) return [];
  const { data } = await supabase.from('content_food')
    .select('id,name,category').ilike('name', `%${q.trim()}%`).limit(12);
  return (data as any[]) ?? [];
}
