import { supabase } from './supabase';

/** R2-J data layer — score history + logs for Progress/History/Calendar. */

export type ScoreRow = { date: string; cas_total: number; c1: number; c2: number; c3: number; c4: number; c5: number; phase: string | null; cycle_day: number | null };

export async function fetchScoreHistory(userId: string, days = 365): Promise<ScoreRow[]> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from('daily_scores')
    .select('date,cas_total,component_1_phase_confidence,component_2_biomarkers,component_3_nutrition,component_4_fitness,component_5_logging,phase,cycle_day')
    .eq('user_id', userId).gte('date', since.toISOString().slice(0, 10)).order('date', { ascending: true });
  return ((data as any[]) ?? []).map((d) => ({
    date: d.date, cas_total: Number(d.cas_total), phase: d.phase, cycle_day: d.cycle_day,
    c1: Number(d.component_1_phase_confidence), c2: Number(d.component_2_biomarkers),
    c3: Number(d.component_3_nutrition), c4: Number(d.component_4_fitness), c5: Number(d.component_5_logging),
  }));
}

/** Split history into cycles using cycle_day resets; last entry = current cycle. */
export function splitCycles(rows: ScoreRow[]): ScoreRow[][] {
  const out: ScoreRow[][] = []; let cur: ScoreRow[] = [];
  let prev = Infinity;
  rows.forEach((r) => {
    const d = r.cycle_day ?? 0;
    if (d < prev && cur.length) { out.push(cur); cur = []; }
    cur.push(r); prev = d;
  });
  if (cur.length) out.push(cur);
  return out;
}
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export async function fetchMoodEnergy(userId: string, days = 120): Promise<{ date: string; mood: number | null; energy: number | null }[]> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from('daily_logs').select('date,mood,energy')
    .eq('user_id', userId).gte('date', since.toISOString().slice(0, 10)).order('date', { ascending: true });
  return (data as any[]) ?? [];
}

/** Cycle Stability (CSS) — long-term mood/energy consistency, NOT today's CAS.
 *  0..1: low = volatile, high = aligned. Needs ≥7 logged days to mean anything. */
export function stabilityScore(logs: { mood: number | null; energy: number | null }[]): { score: number | null; n: number } {
  const vals = logs.filter((l) => l.mood != null && l.energy != null);
  if (vals.length < 7) return { score: null, n: vals.length };
  const series = vals.map((v) => (v.mood! + v.energy!) / 2);
  const m = series.reduce((a, b) => a + b, 0) / series.length;
  const sd = Math.sqrt(series.reduce((a, b) => a + (b - m) * (b - m), 0) / series.length);
  // sd 0 → perfectly stable (1.0); sd ≥ 1.6 (on the 1–5 scale) → volatile (0)
  return { score: Math.max(0, Math.min(1, 1 - sd / 1.6)), n: vals.length };
}

/** R3-34: per-metric stability % from a 1–5 series (sd 0 → 100%, sd ≥1.6 → 0%). */
export function seriesStability(vals: number[], min = 7): number | null {
  if (vals.length < min) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) * (b - m), 0) / vals.length);
  return Math.round(Math.max(0, Math.min(1, 1 - sd / 1.6)) * 100);
}

/**
 * Baseline ladder (post-R6 UX proposal): the user's PERSONAL baseline is the
 * average CAS over her first 7 scored days — frozen by construction (always
 * derived from the same first-7 window, no schema change). Used as the CAS
 * comparison reference until the first full cycle exists ("vs your first
 * week"), when "vs last cycle" takes over.
 */
export function baselineCAS(hist: ScoreRow[]): number | null {
  const asc = [...hist].sort((a, b) => (a.date < b.date ? -1 : 1));
  const first7 = asc.slice(0, 7).map((r) => r.cas_total).filter((v) => v != null) as number[];
  if (first7.length < 7) return null;
  return first7.reduce((a, b) => a + b, 0) / first7.length;
}

/** R3-34: % of the last `days` logged days with any PMS/pain symptom recorded. */
export async function fetchPmsRate(userId: string, days = 7): Promise<number | null> {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from('daily_logs').select('date,pain_symptoms')
    .eq('user_id', userId).gte('date', since.toISOString().slice(0, 10));
  const rows = (data as any[]) ?? [];
  if (rows.length < 3) return null;                       // honest: needs a few logged days
  const withSym = rows.filter((r) => Array.isArray(r.pain_symptoms) && r.pain_symptoms.length > 0).length;
  return Math.round((withSym / rows.length) * 100);
}

/** Days with intimacy logged (calendar stars — F4). */
export async function fetchSexDays(userId: string, fromISO: string): Promise<Set<string>> {
  const { data } = await supabase.from('daily_logs').select('date,sex_logged')
    .eq('user_id', userId).gte('date', fromISO).not('sex_logged', 'is', null);
  return new Set(((data as any[]) ?? []).map((r) => r.date));
}

/** R3-17: sex days WITH protection type — calendar shows ★ (protected) vs ☆ (unprotected). */
export async function fetchSexDayTypes(userId: string, fromISO: string): Promise<Map<string, 'protected' | 'unprotected'>> {
  const { data } = await supabase.from('daily_logs').select('date,sex_logged')
    .eq('user_id', userId).gte('date', fromISO).not('sex_logged', 'is', null);
  const m = new Map<string, 'protected' | 'unprotected'>();
  for (const r of (data as any[]) ?? []) m.set(r.date, r.sex_logged === 'unprotected' ? 'unprotected' : 'protected');
  return m;
}
