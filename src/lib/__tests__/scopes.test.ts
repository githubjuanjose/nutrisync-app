/**
 * UST-2026-09-07-09 · C1 — los scopes de una conexión, lógica pura.
 * Nace del hueco del 3-sep: con Apple Salud ya conectada no había camino a la
 * pantalla señal a señal. Ahora hay modo EDICIÓN y esta es su regla.
 */
import { scopesAEstado, estadoAScopes, tiposNuevos, hayQuePedir, WRITE_FLOW } from '../health/scopes';
import { SIGNALS, SignalType } from '../health/mapping';

describe('scopesAEstado — de la base a la pantalla', () => {
  it('separa los tipos de señal del write-back', () => {
    const r = scopesAEstado(['steps', 'sleep_minutes', WRITE_FLOW]);
    expect([...r.tipos].sort()).toEqual(['sleep_minutes', 'steps']);
    expect(r.escribir).toBe(true);
  });
  it('sin write_flow, escribir = false', () => {
    expect(scopesAEstado(['steps']).escribir).toBe(false);
  });
  it('ignora lo que no conoce y aguanta null (r12-b4)', () => {
    expect(scopesAEstado(['steps', 'garmin_stress', '']).tipos.size).toBe(1);
    expect(scopesAEstado(null).tipos.size).toBe(0);
    expect(scopesAEstado(undefined).escribir).toBe(false);
  });
});

describe('estadoAScopes — de la pantalla a la base', () => {
  it('orden estable (el de SIGNALS) y write_flow al final', () => {
    const tipos = new Set<SignalType>(['steps', 'sleep_minutes']);
    expect(estadoAScopes(tipos, true)).toEqual(['sleep_minutes', 'steps', WRITE_FLOW]);
    expect(estadoAScopes(tipos, false)).toEqual(['sleep_minutes', 'steps']);
  });
  it('ida y vuelta sin pérdidas para todas las señales', () => {
    const todas = new Set<SignalType>(SIGNALS.map((s) => s.type));
    const r = scopesAEstado(estadoAScopes(todas, true));
    expect(r.tipos.size).toBe(SIGNALS.length);
    expect(r.escribir).toBe(true);
  });
});

describe('tiposNuevos / hayQuePedir — la regla de edición', () => {
  it('solo se piden a HealthKit los tipos que antes no estaban', () => {
    expect(tiposNuevos(['steps', 'sleep_minutes'], ['steps', 'sleep_minutes', 'hrv'])).toEqual(['hrv']);
  });
  it('quitar señales no pide nada (dejan de leerse porque sync lee la base)', () => {
    expect(tiposNuevos(['steps', 'sleep_minutes', 'hrv'], ['steps'])).toEqual([]);
    expect(hayQuePedir(['steps', 'sleep_minutes', 'hrv'], ['steps'], false)).toBe(false);
  });
  it('activar el write-back por primera vez sí pide permisos aunque no haya tipos nuevos', () => {
    expect(hayQuePedir(['steps'], ['steps'], true)).toBe(true);
    expect(hayQuePedir(['steps', WRITE_FLOW], ['steps'], true)).toBe(false);
  });
  it('conexión nueva (antes vacío): todo es nuevo', () => {
    expect(tiposNuevos([], ['steps', 'workout'])).toEqual(['steps', 'workout']);
  });
});
