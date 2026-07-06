/**
 * Supabase connection. The URL is the live project; the anon/publishable key is
 * PUBLIC and safe to ship (Row-Level Security protects every row — same key the
 * web app bakes in). It's baked in as the default so the app boots from a fresh
 * clone with no .env; an env var still overrides it if you want.
 *
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   (optional override)
 *
 * NOTE: never put the service_role key here — that must stay server-side only.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nebkqncvapelrarruyqb.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GYj7DKlcWZ2cxdwv-GkyHQ_WBbQWHau';

export const isSupabaseConfigured = SUPABASE_ANON_KEY.length > 20;
