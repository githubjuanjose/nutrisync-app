import { supabase } from './supabase';
import { buildPayloads } from './onboardingMap';
import { planNewCycle, clampPeriodDur } from './cycleStats';

export type UserRow = {
  id: string;
  first_name: string | null;
  city: string | null;
  diet_type: string | null;
  health_conditions: string[] | null;
  contraception_status: string | null;
};
export type CycleRow = {
  user_id: string;
  last_period_start_date: string;
  cycle_length: number | null;
  period_duration: number | null;
};

/** Persist onboarding answers to `users` + `cycles`. */
export async function saveOnboarding(
  userId: string,
  answers: Record<string, string[]>,
  extra: { firstName?: string; email?: string; city?: string; lastPeriodStart: string }
) {
  const { usersRow, cyclesRow } = buildPayloads(userId, answers, extra);

  const { error: uErr } = await supabase.from('users').upsert(usersRow, { onConflict: 'id' });
  if (uErr) throw uErr;

  // `cycles` has no unique(user_id) constraint, so update the existing row or insert a new one.
  const { data: existing } = await supabase
    .from('cycles').select('id').eq('user_id', userId).limit(1).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from('cycles')
      .update({ ...cyclesRow, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cycles').insert(cyclesRow);
    if (error) throw error;
  }
}

export async function getProfile(userId: string): Promise<UserRow | null> {
  const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  return (data as UserRow) ?? null;
}

export async function getCurrentCycle(userId: string): Promise<CycleRow | null> {
  const { data } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', userId)
    .order('last_period_start_date', { ascending: false })   // R8: same rule as the server
    .limit(1)
    .maybeSingle();
  return (data as CycleRow) ?? null;
}

/**
 * R4-f31: user manually logs a new period start → a NEW `cycles` row begins
 * (the previous rows stay as real cycle history). The new row's cycle_length
 * becomes the rolling average of her last ≤6 actual cycle lengths (gap between
 * consecutive period starts, sane range 15–60 days only), feeding Progress and
 * the phase algorithm with her real data instead of the onboarding estimate.
 */
/** r10a-5: `closed` = length of the cycle this start just completed (days from
 *  the previous start to the new one) — feeds the warm "N-day cycle saved" copy.
 *  M-1: `rebaselined` = true SOLO la vez que la media personal sustituye al
 *  onboarding (3er cerrado, D10) — dispara el aviso informativo; `outlier` =
 *  el ciclo recién cerrado quedó fuera del patrón (no moverá la media). */
export async function startNewCycle(userId: string, startISO: string): Promise<{ created: boolean; avg?: number; closed?: number; rebaselined?: boolean; outlier?: boolean }> {
  const { data: rows } = await supabase
    .from('cycles')
    .select('id,last_period_start_date,cycle_length,period_duration')
    .eq('user_id', userId)
    .order('last_period_start_date', { ascending: true });
  const all = (rows ?? []) as any[];
  const prev = all.length ? all[all.length - 1] : null;

  // r11c-2: TODA la decisión (duplicado/corrección/nuevo + D10 + outlier) vive
  // en cycleStats.planNewCycle — pura y cubierta por jest. Aquí solo IO.
  const plan = planNewCycle(all.map((r) => String(r.last_period_start_date)), startISO, prev?.cycle_length ?? 28);

  if (plan.kind === 'duplicate') return { created: false };

  if (plan.kind === 'correction') {
    // R8-f28/f30: fecha ANTERIOR al inicio vigente = corrección de la fila actual
    const { error: upErr } = await supabase.from('cycles')
      .update({ last_period_start_date: startISO, updated_at: new Date().toISOString() })
      .eq('id', prev.id);
    if (upErr) throw upErr;
    return { created: false, avg: prev.cycle_length ?? 28 };
  }

  const { error } = await supabase.from('cycles').insert({
    user_id: userId,
    last_period_start_date: startISO,
    cycle_length: plan.avg,
    period_duration: prev?.period_duration ?? 5,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { created: true, avg: plan.avg, closed: plan.closed, rebaselined: plan.rebaselined, outlier: plan.outlier };
}

/** M-1 · botón "End period" (R10): fija la duración REAL del período del ciclo
 *  vigente (día actual - 1 → hoy ya es folicular) y alimenta el baseline de
 *  duración de los siguientes ciclos. Devuelve la duración guardada. */
export async function endPeriod(userId: string, todayCycleDay: number): Promise<number> {
  const dur = clampPeriodDur(todayCycleDay);   // r11c-2: pura + testeada
  const { data: rows } = await supabase.from('cycles')
    .select('id').eq('user_id', userId)
    .order('last_period_start_date', { ascending: false }).limit(1);
  const cur = (rows ?? [])[0] as any;
  if (!cur) throw new Error('no active cycle');
  const { error } = await supabase.from('cycles')
    .update({ period_duration: dur, updated_at: new Date().toISOString() })
    .eq('id', cur.id);
  if (error) throw error;
  return dur;
}

/** R8-f25: full cycle history (asc) — the calendar maps each date to ITS cycle. */
export async function getAllCycles(userId: string): Promise<CycleRow[]> {
  const { data } = await supabase.from('cycles').select('*')
    .eq('user_id', userId).order('last_period_start_date', { ascending: true });
  return ((data as any[]) ?? []) as CycleRow[];
}

/** True once the user has completed onboarding (has a cycle on file). */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('cycles')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}
