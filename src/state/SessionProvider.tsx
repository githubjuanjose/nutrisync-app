import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

  // r17-i (11-ago, cazado por Juanjo en un iPhone 17 Pro): el arranque hacía DOS
  // viajes de red seguidos antes de que Face ID pudiera aparecer — refrescar el
  // token y, encima, `check()` contra `cycles`. 3-5 segundos mirando un
  // degradado. Y el segundo viaje no hace ninguna falta para esa decisión: para
  // saber si toca Face ID basta con la sesión (local) y una marca en SecureStore
  // (local). `loading` mezclaba dos preguntas y la lenta bloqueaba a la rápida.
  //
  // Ahora `loading` responde solo a «¿sé ya si hay sesión?». El onboarding se
  // resuelve en paralelo y RootNavigator ya sabe esperarlo: tiene su rama para
  // `onboarded === null`. La espera pasa a estar DESPUÉS de identificarse, que
  // es donde molesta menos y donde la pantalla tiene algo que enseñar.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);              // ← la puerta biométrica ya puede decidir
      // Epic K (K4): access log mínimo al abrir con sesión
      if (data.session?.user?.id) {
        supabase.rpc('log_access', { p_platform: Platform.OS, p_version: String(Constants.expoConfig?.version ?? '') }).then(() => {}, () => {});
      }
      void check(data.session?.user.id ?? null);   // en paralelo: ya no bloquea
    }, () => {
      // Si getSession revienta, sin esto el arranque se queda mudo para siempre
      // (r12-b9 llevado al boot: nunca una pantalla que espera sin fin).
      setSession(null);
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
