/**
 * Color de fase, a prueba de datos inesperados.
 *
 * POR QUÉ EXISTE (10-ago, buscando el «negro en la gráfica y la leyenda»)
 * `phaseColor` es un `Record<PhaseKey, string>` con cuatro claves. Tres sitios
 * lo indexaban directamente y SIN respaldo:
 *     const base = phaseColor[phase];        // ui/PhaseRing.tsx
 *     const c    = phaseColor[phase];        // DailyLogScreen.tsx
 * Si `phase` trae cualquier otra cosa —null, cadena vacía, 'Luteal' con
 * mayúscula, un nombre de fase nuevo— eso vale `undefined`.
 *
 * Y aquí está el detalle que lo vuelve invisible: en SVG, un `stroke` o un
 * `fill` con `undefined` no es «sin color», es que el atributo NO SE EMITE, y
 * el valor por defecto de `fill` en SVG es **negro**. Un dato raro no revienta
 * la pantalla: la pinta de negro y no dice nada.
 *
 * Es la misma familia que el crash de Body Insight de esta mañana
 * (`MOODS[valor-1]` → undefined) con distinto final: allí una excepción, aquí
 * un color equivocado. Y explica que el fallo sea «específico de una usuaria»:
 * solo lo ve quien tenga ese dato.
 *
 * Regla que aplica (r12-b4, «el valor por defecto es una elección»): si el
 * dato no viene, manda el RESPALDO DECLARADO, nunca un undefined silencioso.
 */
import { colors, phaseColor, PhaseKey } from '../theme';

const CLAVES: PhaseKey[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

/**
 * LA CAUSA DE VERDAD DEL NEGRO — y no era «un dato raro».
 *
 * En el proyecto conviven DOS vocabularios de fase, los dos legítimos:
 *   · el del CÁLCULO (`PHASES` en lib/cas.ts) tiene CINCO valores, porque
 *     distingue `early_luteal` de `late_luteal` para puntuar el CAS;
 *   · el de PRESENTACIÓN (`PhaseKey` en theme.ts) tiene CUATRO: la usuaria
 *     ve «lútea», no dos lúteas.
 * `displayPhase()` hace ese colapso… pero si a `phaseColor` le llegaba la
 * fase SIN colapsar, `phaseColor['early_luteal']` era undefined → negro.
 *
 * O sea: no le pasaba a una tester con datos corruptos. Le pasaba a
 * CUALQUIERA que estuviera en fase lútea, que es media vuelta del ciclo.
 * Por eso «solo algunas» lo veían: las demás no estaban en lútea ese día.
 */
const COLAPSO: Record<string, PhaseKey> = {
  early_luteal: 'luteal',
  late_luteal: 'luteal',
};

/** El color cuando no sabemos la fase. Coral de marca: neutro y nunca negro. */
export const COLOR_SIN_FASE = colors.coral;

/**
 * Devuelve el color de la fase. Acepta lo que venga: normaliza mayúsculas y
 * espacios, y ante cualquier cosa que no reconozca devuelve el respaldo.
 */
export function colorDeFase(fase: unknown): string {
  if (typeof fase !== 'string') return COLOR_SIN_FASE;
  const limpia = COLAPSO[fase.trim().toLowerCase()] ?? fase.trim().toLowerCase();
  return (CLAVES as string[]).includes(limpia)
    ? phaseColor[limpia as PhaseKey]
    : COLOR_SIN_FASE;
}

/** ¿Es una fase que conocemos? Útil para decidir si enseñar la etiqueta. */
export function esFaseConocida(fase: unknown): boolean {
  if (typeof fase !== 'string') return false;
  const l = fase.trim().toLowerCase();
  return (CLAVES as string[]).includes(COLAPSO[l] ?? l);
}

/** El nombre de presentación: colapsa las dos lúteas en una. Misma regla que
 *  `displayPhase()` de cas.ts, aquí para quien solo necesita pintar. */
export function faseVisible(fase: unknown): PhaseKey | null {
  if (typeof fase !== 'string') return null;
  const l = fase.trim().toLowerCase();
  const c = COLAPSO[l] ?? l;
  return (CLAVES as string[]).includes(c) ? (c as PhaseKey) : null;
}
