/**
 * El ÚNICO fichero que menciona el módulo nativo de Health Connect.
 *
 * Es `.native.ts` a propósito, igual que hkNativo (r22): Metro lo resuelve SOLO
 * en iOS/Android y el build web coge la pareja `hcNativo.ts`, que devuelve
 * null. Así el literal del paquete nativo no entra jamás en el bundle del
 * navegador — el guardián de la PWA (pwa-tests) vigila exactamente eso.
 *
 * El require vive en try/catch: en un runtime SIN el binario (una OTA sobre un
 * build anterior al 25-ago, como el 0.22.0) falla limpio y todo queda apagado.
 */
export function cargaHC(): Record<string, any> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('react-native-health-connect');
    if (m?.default && typeof m.default === 'object' && Object.keys(m.default).length) {
      return { ...m, ...m.default };
    }
    return m ?? null;
  } catch {
    return null;
  }
}
