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

/** True once the user has completed onboarding (has a cycle on file). */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('cycles')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}
