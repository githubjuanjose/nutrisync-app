/**
 * r12-b4 · SELECTORES DE VALOR — la lógica pura, fuera de la UI.
 *
 * Regla que nos ha mordido dos veces (rueda de métricas r11b-2 y ahora el
 * checklist de movimiento): **el valor por defecto es una elección**. Si el
 * usuario abre un selector y acepta lo que ya está marcado sin tocar nada, el
 * valor tiene que quedar comprometido igual. Todo lo que decide "qué valor sale
 * de aquí" vive en este fichero y está cubierto por unitarios.
 */

/** Índice bajo la banda de selección para un desplazamiento `y` (clamp incluido). */
export function wheelIndex(y: number, itemH: number, len: number): number {
  if (!(len > 0)) return 0;
  if (!(itemH > 0) || !Number.isFinite(y)) return 0;
  return Math.min(len - 1, Math.max(0, Math.round(y / itemH)));
}

/** Desplazamiento que centra el índice `i` (para abrir la rueda ya alineada). */
export function wheelOffset(i: number, itemH: number, len: number): number {
  return Math.min(Math.max(0, len - 1), Math.max(0, Math.round(i))) * itemH;
}

/**
 * Valor que un selector debe ENTREGAR. `touched` es lo que el usuario cambió
 * (puede no existir); `def` es lo que la pantalla mostraba de partida.
 * Nunca devuelve undefined: si había defecto visible, ese es el valor.
 */
export function commit<T>(touched: T | null | undefined, def: T | null | undefined): T | null {
  return (touched ?? def ?? null) as T | null;
}

/** Índice inicial de una lista a partir del valor actual (o 0 si no está). */
export function indexOfValue<T>(values: readonly T[], current: T | null | undefined, fallback = 0): number {
  const i = values.indexOf(current as T);
  return i >= 0 ? i : Math.min(Math.max(0, fallback), Math.max(0, values.length - 1));
}
