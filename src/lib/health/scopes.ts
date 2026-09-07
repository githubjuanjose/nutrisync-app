/**
 * Wearables · los SCOPES de una conexión, como lógica PURA (UST-2026-09-07-09 · C1).
 *
 * Una conexión guarda en connected_providers.scopes qué señales consintió la
 * usuaria (tipos de SIGNALS) y, aparte, 'write_flow' (devolver el período a
 * Salud). La pantalla de consentimiento trabaja con un Set de tipos + un
 * booleano; aquí viven las dos traducciones y la regla de EDICIÓN: a HealthKit
 * solo se le piden los tipos que antes no estaban. Los quitados no se revocan
 * aquí — sync.ts solo lee los scopes de la base, así que dejan de leerse solos.
 * Sin IO: el IO consume, los tests cubren (r11c-2).
 */
import { SIGNALS, SignalType } from './mapping';

export const WRITE_FLOW = 'write_flow';

const esTipo = (s: string): s is SignalType => SIGNALS.some((x) => x.type === s);

/** scopes de la base → estado de la pantalla. Lo desconocido se ignora (r12-b4: respaldo declarado, nunca reventar). */
export function scopesAEstado(
  scopes: readonly string[] | null | undefined,
): { tipos: Set<SignalType>; escribir: boolean } {
  const tipos = new Set<SignalType>();
  let escribir = false;
  for (const s of scopes ?? []) {
    if (s === WRITE_FLOW) escribir = true;
    else if (esTipo(s)) tipos.add(s);
  }
  return { tipos, escribir };
}

/** estado de la pantalla → scopes que se guardan. Orden estable (el de SIGNALS), write_flow al final. */
export function estadoAScopes(tipos: ReadonlySet<SignalType>, escribir: boolean): string[] {
  const out: string[] = SIGNALS.filter((s) => tipos.has(s.type)).map((s) => s.type);
  if (escribir) out.push(WRITE_FLOW);
  return out;
}

/** Al EDITAR: los tipos que hay que PEDIR a HealthKit son los que antes no estaban. */
export function tiposNuevos(antes: readonly string[], despues: readonly SignalType[]): SignalType[] {
  const a = new Set(antes);
  return despues.filter((t) => !a.has(t));
}

/** ¿Hay que abrir el diálogo de permisos? Solo con tipos nuevos o con el write-back recién activado. */
export function hayQuePedir(antes: readonly string[], tipos: readonly SignalType[], escribir: boolean): boolean {
  return tiposNuevos(antes, tipos).length > 0 || (escribir && !antes.includes(WRITE_FLOW));
}
