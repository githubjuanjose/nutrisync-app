/**
 * IO de la auto-aplicación de OTAs: el hook que consume la política pura.
 * Comprueba al montar y en cada vuelta a primer plano (con acelerador).
 * Silencioso a propósito: la recarga tarda <1 s y no merece pantalla propia.
 * Si CUALQUIER paso falla (sin red, CDN caído…), la app sigue como estaba:
 * el peor caso es exactamente el comportamiento de ayer.
 */
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { shouldCheck, decide } from './otaPolicy';
import { shouldPing } from './heartbeat';
import { supabase } from './supabase';

export function useOtaAutoApply() {
  const lastCheck = useRef<number | null>(null);
  const lastPing = useRef<number>(Date.now());   // el montaje ya lo apuntó K4

  useEffect(() => {
    let vivo = true;

    async function comprobar() {
      if (!shouldCheck(lastCheck.current, Date.now())) return;
      lastCheck.current = Date.now();
      try {
        if (__DEV__ || String(Platform.OS) === 'web' || !Updates.isEnabled) return;
        const check = await Updates.checkForUpdateAsync();
        if (!vivo || !check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (!vivo) return;
        const accion = decide({
          enabled: Updates.isEnabled,
          isWeb: String(Platform.OS) === 'web',
          checkAvailable: check.isAvailable,
          fetchedNew: fetched.isNew,
        });
        if (accion === 'reload') await Updates.reloadAsync();
      } catch {
        /* sin red o CDN caído: silencio — la próxima vuelta a primer plano reintenta */
      }
    }

    comprobar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        comprobar();
        /* r14g: ronda de primer plano — máx. 1/hora, jamás en web, y en
           silencio absoluto: si falla, la app ni se entera. */
        if (String(Platform.OS) !== 'web' && shouldPing(lastPing.current, Date.now())) {
          lastPing.current = Date.now();
          supabase.rpc('log_access', {
            p_platform: Platform.OS,
            p_version: String(Constants.expoConfig?.version ?? ''),
          }).then(() => {}, () => {});
        }
      }
    });
    return () => { vivo = false; sub.remove(); };
  }, []);
}
