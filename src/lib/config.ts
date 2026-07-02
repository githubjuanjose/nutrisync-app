/**
 * Supabase connection. The URL is the live project; the anon key is public
 * (safe to ship) but not committed — set it via an env var before running:
 *
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (see .env.example)
 *
 * Use the SAME anon/publishable key you use for the web app.
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nebkqncvapelrarruyqb.supabase.co';

export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = SUPABASE_ANON_KEY.length > 20;
