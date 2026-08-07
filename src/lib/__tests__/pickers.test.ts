/** r12-b4 · SELECTORES DE VALOR — "el defecto también es una elección".
 *  Petición expresa de Juanjo (4-ago) tras el bug del anillo de movimiento:
 *  validaciones unitarias para los pickers de valores. */
import { wheelIndex, wheelOffset, commit, indexOfValue } from '../pickers';

describe('wheelIndex — la banda de selección manda', () => {
  it.each([
    [0, 0], [21, 0], [22, 1], [44, 1], [88, 2],
  ] as [number, number][])('y=%i → índice %i', (y, want) => {
    expect(wheelIndex(y, 44, 10)).toBe(want);
  });
  it('recorta por arriba y por abajo (rebote de scroll incluido)', () => {
    expect(wheelIndex(-120, 44, 10)).toBe(0);
    expect(wheelIndex(99999, 44, 10)).toBe(9);
  });
  it('nunca devuelve NaN aunque la lista esté vacía o el alto sea 0', () => {
    expect(wheelIndex(100, 0, 10)).toBe(0);
    expect(wheelIndex(100, 44, 0)).toBe(0);
    expect(wheelIndex(NaN, 44, 10)).toBe(0);
  });
});

describe('wheelOffset — abrir la rueda YA alineada con el valor visible', () => {
  it('centra el índice pedido', () => { expect(wheelOffset(3, 44, 10)).toBe(132); });
  it('recorta índices imposibles', () => {
    expect(wheelOffset(-5, 44, 10)).toBe(0);
    expect(wheelOffset(50, 44, 10)).toBe(9 * 44);
  });
});

describe('commit — el valor por defecto NO se queda fuera', () => {
  it('sin tocar nada entrega el defecto (bug r11b-2 y r12-b4)', () => {
    expect(commit(undefined, 'moderate')).toBe('moderate');
    expect(commit(null, 165)).toBe(165);
  });
  it('lo elegido gana al defecto', () => { expect(commit('high', 'moderate')).toBe('high'); });
  it('sin defecto ni elección → null explícito, jamás undefined', () => {
    expect(commit(undefined, undefined)).toBeNull();
  });
  it('un 0 elegido es un valor, no un vacío', () => { expect(commit(0, 5)).toBe(0); });
});

describe('indexOfValue — posicionar la lista en el valor actual', () => {
  const vals = ['low', 'moderate', 'high'];
  it('encuentra el actual', () => { expect(indexOfValue(vals, 'high')).toBe(2); });
  it('valor desconocido → fallback', () => { expect(indexOfValue(vals, 'zzz', 1)).toBe(1); });
  it('fallback fuera de rango se recorta', () => { expect(indexOfValue(vals, null, 99)).toBe(2); });
  it('lista vacía → 0', () => { expect(indexOfValue([], 'x', 3)).toBe(0); });
});
