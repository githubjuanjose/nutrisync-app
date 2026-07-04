import { supabase } from '../supabase';

export type Connection = { provider: string; status: string; scopes: string[]; connected_at: string };

/** Providers the user currently has connected. */
export async function getConnections(userId: string): Promise<Connection[]> {
  const { data } = await supabase
    .from('connected_providers')
    .select('provider,status,scopes,connected_at')
    .eq('user_id', userId)
    .eq('status', 'connected');
  return (data as Connection[]) ?? [];
}

/** Record a consented connection (E-P3). Live sync is wired per-provider in the dev build. */
export async function connectProvider(userId: string, provider: string, scopes: string[]) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('connected_providers').upsert(
    { user_id: userId, provider, scopes, status: 'connected', consent_ts: now, connected_at: now, revoked_at: null },
    { onConflict: 'user_id,provider' }
  );
  if (error) throw error;
}

/** Revoke a connection — stops future sync (E-P3). */
export async function disconnectProvider(userId: string, provider: string) {
  const { error } = await supabase
    .from('connected_providers')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', provider);
  if (error) throw error;
}
