import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { hasCompletedOnboarding } from '../lib/api';

type Ctx = {
  session: Session | null;
  userId: string | null;
  loading: boolean;
  onboarded: boolean | null;        // null while unknown / checking
  refreshOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({
  session: null, userId: null, loading: true, onboarded: null,
  refreshOnboarding: async () => {}, signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // R3-05: this check hitting the network with no timeout was the eternal-splash
  // bug — if it hung, `onboarded` stayed null and RootNavigator showed the
  // loading screen until force-quit. Now: 8s timeout + last-known value cached
  // on device, so boot always resolves (fresh answer > cached answer > false).
  const check = useCallback(async (uid: string | null) => {
    if (!uid) { setOnboarded(null); return; }
    const KEY = 'ns.onboarded.' + uid;
    try {
      const v = (await Promise.race([
        hasCompletedOnboarding(uid),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ])) as boolean;
      setOnboarded(v);
      AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
    } catch {
      const cached = await AsyncStorage.getItem(KEY).catch(() => null);
      setOnboarded(cached != null ? cached === '1' : false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await check(data.session?.user.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await check(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  const refreshOnboarding = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await check(data.user?.id ?? null);
  }, [check]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  return (
    <SessionContext.Provider
      value={{ session, userId: session?.user.id ?? null, loading, onboarded, refreshOnboarding, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
