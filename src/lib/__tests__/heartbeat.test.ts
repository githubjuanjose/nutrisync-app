import { shouldPing, PING_INTERVAL_MIN } from '../heartbeat';
const MIN = 60_000;

describe('shouldPing — la ronda de primer plano', () => {
  it('al montar no repite el apunte del K4', () => {
    expect(shouldPing(null, Date.now())).toBe(false);
  });
  it('dentro de la hora: silencio', () => {
    const ahora = 2_000_000_000;
    expect(shouldPing(ahora - 30 * MIN, ahora)).toBe(false);
  });
  it('pasada la hora: apunta', () => {
    const ahora = 2_000_000_000;
    expect(shouldPing(ahora - (PING_INTERVAL_MIN + 1) * MIN, ahora)).toBe(true);
  });
  it('justo en el límite: apunta (>=)', () => {
    const ahora = 2_000_000_000;
    expect(shouldPing(ahora - PING_INTERVAL_MIN * MIN, ahora)).toBe(true);
  });
  it('reloj hacia atrás o basura: apunta y resetea, no se cuelga', () => {
    expect(shouldPing(3_000_000_000, 2_000_000_000)).toBe(true);
    expect(shouldPing(NaN, Date.now())).toBe(false);
  });
});
