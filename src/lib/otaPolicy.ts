/**
 * Política de auto-aplicación de OTAs (r14 · petición Juanjo 5-ago).
 *
 * El problema: expo-updates descarga en segundo plano y aplica en el SIGUIENTE
 * arranque — de ahí el ritual «cierra la app dos veces» que nadie debería tener
 * que aprender. Esto lo convierte en: comprobar al arrancar y al volver a
 * primer plano, y si hay actualización, descargarla y recargar YA.
 *
 * Lógica PURA (regla r11c-2): el IO vive en otaAutoApply.ts; aquí las
 * decisiones, con unitarios. El peligro clásico de recargar-al-arrancar son
 * los bucles: la protección real es estructural (tras reloadAsync el bundle
 * nuevo ya no ve actualización disponible), y encima va un acelerador con
 * memoria — no comprobamos más de una vez por ventana de tiempo.
 */

export const MIN_CHECK_INTERVAL_MIN = 5;

/** ¿Toca comprobar? Regla del acelerador: nunca dos veces en la misma ventana. */
export function shouldCheck(
  lastCheckMs: number | null,
  nowMs: number,
  minIntervalMin: number = MIN_CHECK_INTERVAL_MIN,
): boolean {
  if (lastCheckMs == null) return true;
  if (!Number.isFinite(lastCheckMs) || !Number.isFinite(nowMs)) return true;
  if (nowMs < lastCheckMs) return true;            // reloj hacia atrás: mejor comprobar
  return nowMs - lastCheckMs >= minIntervalMin * 60_000;
}

/** Traduce el resultado de expo-updates a UNA decisión.
 *
 *  r22 (25-ago, los 5-7 s de arranque de Juanjo): recargar EN EL ARRANQUE era
 *  pagar el precio en el peor momento — arranque → descarga → reinicio entero
 *  → SEGUNDO Face ID. Ahora el arranque solo DESCARGA (defer) y la recarga se
 *  aplica al volver a primer plano, donde el re-lock de 5 min ya iba a pedir
 *  Face ID igualmente. Si la app muere antes de volver, expo-updates lanza la
 *  descargada en el siguiente arranque en frío: la actualización nunca se
 *  pierde, solo deja de cobrarse en la cara del arranque. */
export function decide(input: {
  enabled: boolean;          // Updates.isEnabled (false en Expo Go y en dev)
  isWeb: boolean;            // en la PWA no existe expo-updates: jamás actuar
  checkAvailable: boolean;   // checkForUpdateAsync().isAvailable
  fetchedNew: boolean;       // fetchUpdateAsync().isNew
  phase?: 'launch' | 'resume';   // ¿arranque en frío o vuelta a primer plano?
}): 'reload' | 'defer' | 'none' {
  if (!input.enabled || input.isWeb) return 'none';
  if (!input.checkAvailable) return 'none';
  if (!input.fetchedNew) return 'none';
  return input.phase === 'launch' ? 'defer' : 'reload';
}
