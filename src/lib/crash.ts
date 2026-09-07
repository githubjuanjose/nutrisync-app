/**
 * Pareja web/test de crash.native.ts (patrón hkNativo, r22): en web y en jest
 * no hay Crashlytics — todo no-op. Metro elige el .native en iOS/Android.
 */
export async function iniciarCrash(): Promise<boolean> {
  return false;
}

export function registrarError(_e: unknown, _contexto?: string): void {
  /* no-op fuera del binario nativo */
}
