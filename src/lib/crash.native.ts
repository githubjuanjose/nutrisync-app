/**
 * r24-f · Crashlytics SIN identidad (decisión Juanjo, 2-sep-2026).
 * Solo viaja el motivo del crash + modelo/OS/versión de app. JAMÁS setUserId,
 * jamás atributos con datos de usuaria (email, ciclo, comidas): la nota
 * informativa a founders afirma «cero PII» y este fichero es su garantía.
 * Patrón hkNativo (r22): require perezoso dentro de try — si el módulo nativo
 * no está en el binario (runtimes ≤0.23.0), todo es no-op silencioso y la OTA
 * jamás revienta. Metro nunca resuelve este .native.ts en web (pwa-tests).
 */
let activo = false;

export async function iniciarCrash(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const c = require('@react-native-firebase/crashlytics');
    const cl = c.getCrashlytics ? c.getCrashlytics() : c.default();
    if (c.setCrashlyticsCollectionEnabled) await c.setCrashlyticsCollectionEnabled(cl, true);
    else if (cl.setCrashlyticsCollectionEnabled) await cl.setCrashlyticsCollectionEnabled(true);
    activo = true;
    return true;
  } catch {
    return false; // módulo ausente en este runtime: sin ruido, sin romper nada
  }
}

/** Errores CAPTURADOS que queremos ver en el panel (no tumban la app). */
export function registrarError(e: unknown, contexto?: string): void {
  if (!activo) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const c = require('@react-native-firebase/crashlytics');
    const cl = c.getCrashlytics ? c.getCrashlytics() : c.default();
    const err = e instanceof Error ? e : new Error(String(e));
    if (contexto) {
      if (c.log) c.log(cl, contexto);
      else if (cl.log) cl.log(contexto);
    }
    if (c.recordError) c.recordError(cl, err);
    else if (cl.recordError) cl.recordError(err);
  } catch {
    /* no-op */
  }
}
