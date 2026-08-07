/**
 * r14g · Latido de primer plano: el K4 apunta el arranque en frío; esto apunta
 * las VUELTAS a primer plano (máx. 1/hora) para que «aperturas por día» no
 * infracuente a quien vive con la app abierta. Pura a propósito: el IO la consume.
 */
export const PING_INTERVAL_MIN = 60;

export function shouldPing(last: number | null, now: number): boolean {
  if (last == null || !isFinite(last)) return false;      // el montaje ya lo apuntó K4
  if (now < last) return true;                            // reloj hacia atrás: mejor apuntar que colgarse
  return now - last >= PING_INTERVAL_MIN * 60_000;
}
