import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Epic K (4B): PKCE so the native Google flow can exchange the ?code=
    // returned to nutrisync://auth via exchangeCodeForSession. Password,
    // OTP and Apple id-token flows are unaffected by the flow type.
    flowType: 'pkce',
  },
});
