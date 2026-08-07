// NutriSync · push (N1, 0.21) — alta y baja del canal push.
// Diseño: (1) el permiso se pide SOLO al activar la función (patrón L8 de
// wearables: por función, al activarla — jamás al abrir la app); (2) require
// PEREZOSO con guardas: el mismo bundle JS viaja por OTA a runtimes 0.18-0.20
// donde el módulo nativo NO existe — nada debe evaluarse ni romper allí;
// (3) web: la PWA no tiene push en esta fase.
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { mapPermission, buildPrefsUpsert } from './pushPure';

export type PushStatus = 'ok' | 'denied' | 'unsupported' | 'error';

const EAS_PROJECT_ID = '3b124e7e-e7e8-43ed-a54c-b660a07109dc';

function cargar(): { N: any; Device: any } | null {
  try {
    // require dinámico: en un runtime sin el módulo nativo lanza y devolvemos null
    const N = require('expo-notifications');
    const Device = require('expo-device');
    return { N, Device };
  } catch {
    return null;
  }
}

/** Alta del push: permiso → canal Android → token Expo → notification_prefs.
 *  Devuelve un estado plano que la pantalla traduce a UI (sin excepciones). */
export async function enablePush(userId: string, idioma = 'en'): Promise<PushStatus> {
  if (Platform.OS === 'web') return 'unsupported';
  const mods = cargar();
  if (!mods) return 'unsupported';                       // runtime ≤0.20
  const { N, Device } = mods;
  try {
    if (Device?.isDevice === false) return 'unsupported'; // simulador: sin APNs/FCM
    let st = mapPermission((await N.getPermissionsAsync())?.status);
    if (st === 'ask') st = mapPermission((await N.requestPermissionsAsync())?.status);
    if (st !== 'granted') return 'denied';
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'NutriSync',
        importance: N.AndroidImportance?.DEFAULT ?? 3,
      });
    }
    const token = (await N.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID }))?.data;
    if (!token) return 'error';
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
    const { error } = await supabase
      .from('notification_prefs')
      .upsert(buildPrefsUpsert(userId, token, Platform.OS, zona, idioma), { onConflict: 'user_id' });
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

/** Baja: el token se anula (el despachador N3 ignora prefs sin token).
 *  Los interruptores de la usuaria se conservan tal cual. */
export async function disablePush(userId: string): Promise<void> {
  try {
    await supabase.from('notification_prefs').update({ push_token: null }).eq('user_id', userId);
  } catch { /* sin red: la próxima alta lo repara */ }
}
