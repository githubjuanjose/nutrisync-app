/** Timeouts 0.23.0 — la decisión de re-lock es pura y se prueba sola. */
import { debeRelock, RELOCK_MS } from '../relock';

describe('debeRelock — 5 min fuera con candado → pide Face ID', () => {
  it('justo en el umbral y por encima: sí', () => {
    expect(debeRelock(RELOCK_MS, true)).toBe(true);
    expect(debeRelock(RELOCK_MS + 1, true)).toBe(true);
  });
  it('por debajo del umbral: no (cambiar de app un momento no castiga)', () => {
    expect(debeRelock(RELOCK_MS - 1, true)).toBe(false);
    expect(debeRelock(0, true)).toBe(false);
  });
  it('sin candado activado: jamás', () => {
    expect(debeRelock(RELOCK_MS * 10, false)).toBe(false);
  });
  it('basura defensiva: negativos y NaN no bloquean', () => {
    expect(debeRelock(-5, true)).toBe(false);
    expect(debeRelock(NaN, true)).toBe(false);
  });
});
