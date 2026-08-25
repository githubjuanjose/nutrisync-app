/**
 * Timeouts por superficie (0.23.0) — la mitad APP: re-lock biométrico.
 * Regla: 5 minutos en segundo plano con el candado activado → la vuelta pide
 * Face ID otra vez. Función pura con unitarios; BioGate la consume.
 */
export const RELOCK_MS = 5 * 60 * 1000;

/** ¿Toca re-bloquear al volver del fondo? */
export function debeRelock(
  msFuera: number,
  candadoActivado: boolean,
  umbralMs: number = RELOCK_MS,
): boolean {
  if (!candadoActivado) return false;
  if (!isFinite(msFuera) || msFuera < 0) return false;
  return msFuera >= umbralMs;
}
