/**
 * Rama WEB (y por defecto) del cargador de HealthKit: no hay nada que cargar.
 * La pareja `.native.ts` de al lado es la que trae el módulo real en iOS.
 */
export function cargaHK(): Record<string, any> | null {
  return null;
}
