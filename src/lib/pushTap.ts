// NutriSync · pushTap (N4, 0.21) — del toque en la notificación a su pantalla.
// Mismo contrato de seguridad que push.ts: require PEREZOSO con guardas — el
// bundle viaja por OTA a runtimes sin el módulo nativo y NADA debe romper.
// El handler de primer plano muestra el aviso también con la app abierta.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { destinoPush } from './pushPure';

export const navRef = createNavigationContainerRef<any>();

function irA(grupo: string | undefined) {
  // El destino lo decide una función pura con unitarios; aquí solo se navega.
  const { tab, pantalla } = destinoPush(grupo);
  let intentos = 0;
  const ir = () => {
    if (navRef.isReady()) {
      navRef.navigate('Main', { screen: 'Tabs', params: { screen: tab } });
      // Y si el aviso tiene un destino más profundo, se abre encima: la
      // usuaria aterriza en lo que tocó, no en el barrio donde vive.
      if (pantalla) setTimeout(() => { try { navRef.navigate(pantalla as never); } catch { /* ruta aún no montada */ } }, 120);
    } else if (intentos++ < 10) setTimeout(ir, 400);   // arranque en frío: la nav aún monta
  };
  ir();
}

export function usePushTap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let N: any;
    try { N = require('expo-notifications'); } catch { return; }   // runtime ≤0.20
    try {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true,
          shouldPlaySound: false, shouldSetBadge: false,
        }),
      });
      // toque con la app viva (fondo o primer plano)
      const sub = N.addNotificationResponseReceivedListener((r: any) => {
        irA(r?.notification?.request?.content?.data?.grupo);
      });
      // toque que ARRANCÓ la app (frío)
      N.getLastNotificationResponseAsync?.().then((r: any) => {
        if (r) irA(r?.notification?.request?.content?.data?.grupo);
      });
      return () => { try { sub?.remove(); } catch { /* noop */ } };
    } catch { /* módulo raro: silencio, la app sigue */ }
  }, []);
}
