import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
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

  const check = useCallback(async (uid: string | null) => {
    if (!uid) { setOnboarded(null); return; }
    try { setOnboarded(await hasCompletedOnboarding(uid)); }
    catch { setOnboarded(false); }
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
