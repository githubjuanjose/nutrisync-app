import { localDayISO } from '../localDay';

const fake = (y: number, m1: number, d: number) =>
  ({ getFullYear: () => y, getMonth: () => m1 - 1, getDate: () => d });

describe('localDayISO — la clave de día es la LOCAL (NS-0010)', () => {
  it('formatea con padding', () => {
    expect(localDayISO(fake(2026, 8, 6))).toBe('2026-08-06');
    expect(localDayISO(fake(2026, 1, 5))).toBe('2026-01-05');
    expect(localDayISO(fake(2030, 12, 31))).toBe('2030-12-31');
  });
  it('desayuno a las 7:30 local NUNCA es ayer, esté donde esté el huso', () => {
    // Con el corte UTC viejo, en UTC+8 new Date(...,7,30) → toISOString daba el día anterior.
    const desayuno = new Date(2026, 7, 6, 7, 30);   // 6-ago 07:30 LOCAL
    expect(localDayISO(desayuno)).toBe('2026-08-06');
  });
  it('medianoche y 23:59 locales caen en el mismo día local', () => {
    expect(localDayISO(new Date(2026, 7, 6, 0, 0, 1))).toBe('2026-08-06');
    expect(localDayISO(new Date(2026, 7, 6, 23, 59, 59))).toBe('2026-08-06');
  });
  it('DOB del picker (medianoche local) conserva el día elegido', () => {
    expect(localDayISO(new Date(1995, 2, 15))).toBe('1995-03-15');
  });
  it('hoy por defecto: coincide con los getters locales de ahora mismo', () => {
    const n = new Date();
    expect(localDayISO()).toBe(localDayISO(n));
  });
});
