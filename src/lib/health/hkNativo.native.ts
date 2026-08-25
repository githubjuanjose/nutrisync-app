/**
 * El ÚNICO fichero que menciona el módulo nativo de HealthKit.
 *
 * Es `.native.ts` a propósito: Metro lo resuelve SOLO en iOS/Android; el build
 * web coge `hkNativo.ts` (el de al lado, que devuelve null). Así el literal
 * del paquete nativo no puede colarse en el bundle del navegador ni por
 * accidente — el guardián de la PWA (pwa-tests) vigila exactamente eso.
 *
 * El require vive en try/catch: en un runtime SIN el binario (OTA sobre un
 * build viejo, pre-0.23.0) falla limpio y todo queda apagado.
 */
export function cargaHK(): Record<string, any> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('@kingstinct/react-native-healthkit');
    if (m?.default && typeof m.default === 'object' && Object.keys(m.default).length) {
      return { ...m, ...m.default };
    }
    return m ?? null;
  } catch {
    return null;
  }
}
