import { shouldCheck, decide, MIN_CHECK_INTERVAL_MIN } from '../otaPolicy';

const MIN = 60_000;

describe('shouldCheck — el acelerador', () => {
  it('primera vez: siempre', () => {
    expect(shouldCheck(null, Date.now())).toBe(true);
  });
  it('dentro de la ventana: no (evita martillear al volver de un cambio de app)', () => {
    const ahora = 1_000_000_000;
    expect(shouldCheck(ahora - 2 * MIN, ahora)).toBe(false);
  });
  it('pasada la ventana: sí', () => {
    const ahora = 1_000_000_000;
    expect(shouldCheck(ahora - (MIN_CHECK_INTERVAL_MIN + 1) * MIN, ahora)).toBe(true);
  });
  it('justo en el límite: sí (>=, no >)', () => {
    const ahora = 1_000_000_000;
    expect(shouldCheck(ahora - MIN_CHECK_INTERVAL_MIN * MIN, ahora)).toBe(true);
  });
  it('reloj hacia atrás o basura: comprobar antes que quedarse colgado', () => {
    expect(shouldCheck(2_000_000_000, 1_000_000_000)).toBe(true);
    expect(shouldCheck(NaN, Date.now())).toBe(true);
  });
});

describe('decide — una sola decisión', () => {
  const base = { enabled: true, isWeb: false, checkAvailable: true, fetchedNew: true };
  it('todo alineado → reload', () => {
    expect(decide(base)).toBe('reload');
  });
  it('deshabilitado (Expo Go / dev) → jamás', () => {
    expect(decide({ ...base, enabled: false })).toBe('none');
  });
  it('en la PWA → jamás (expo-updates no existe en web)', () => {
    expect(decide({ ...base, isWeb: true })).toBe('none');
  });
  it('sin actualización disponible → nada', () => {
    expect(decide({ ...base, checkAvailable: false })).toBe('none');
  });
  it('descarga que no trae nada nuevo → nada (LA protección anti-bucle)', () => {
    expect(decide({ ...base, fetchedNew: false })).toBe('none');
  });
});
