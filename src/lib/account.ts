import { Share } from 'react-native';
import { supabase } from './supabase';

const USER_TABLES = [
  'meal_logs', 'daily_scores', 'nutrition_checklist', 'movement_checklist',
  'daily_logs', 'cycles', 'user_phase_averages',
] as const;

/** GDPR data export (§B1): gather everything and share as JSON. */
export async function exportUserData(userId: string) {
  const out: Record<string, any> = { exported_at: new Date().toISOString() };
  const { data: profile } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  out.profile = profile;
  for (const t of USER_TABLES) {
    const { data } = await supabase.from(t).select('*').eq('user_id', userId);
    out[t] = data ?? [];
  }
  const json = JSON.stringify(out, null, 2);
  await Share.share({ title: 'NutriSync data export', message: json });
  return json;
}

/**
 * Delete the user's data (§B2). Removes all rows scoped to the user, then signs out.
 * NOTE: erasing the auth record itself requires a service-role Edge Function
 * (documented in docs/09); this handles the app-data deletion + sign-out.
 */
export async function deleteAccountData(userId: string) {
  for (const t of USER_TABLES) {
    await supabase.from(t).delete().eq('user_id', userId);
  }
  await supabase.from('users').delete().eq('id', userId);
  await supabase.auth.signOut();
}
