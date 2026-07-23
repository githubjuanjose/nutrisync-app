import { supabase } from './supabase';
import { buildPayloads } from './onboardingMap';

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
    .order('updated_at', { ascending: false })
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
export async function startNewCycle(userId: string, startISO: string): Promise<{ created: boolean; avg?: number }> {
  const { data: rows } = await supabase
    .from('cycles')
    .select('id,last_period_start_date,cycle_length,period_duration')
    .eq('user_id', userId)
    .order('last_period_start_date', { ascending: true });
  const all = (rows ?? []) as any[];
  const prev = all.length ? all[all.length - 1] : null;
  if (prev && String(prev.last_period_start_date).slice(0, 10) === startISO) return { created: false };

  const starts = [...all.map((r) => String(r.last_period_start_date).slice(0, 10)), startISO]
    .map((s) => new Date(s + 'T00:00:00').getTime())
    .sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const d = Math.round((starts[i] - starts[i - 1]) / 86_400_000);
    if (d >= 15 && d <= 60) diffs.push(d);
  }
  const recent = diffs.slice(-6);
  const avg = recent.length
    ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    : (prev?.cycle_length ?? 28);

  const { error } = await supabase.from('cycles').insert({
    user_id: userId,
    last_period_start_date: startISO,
    cycle_length: avg,
    period_duration: prev?.period_duration ?? 5,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { created: true, avg };
}

/** True once the user has completed onboarding (has a cycle on file). */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('cycles')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}
