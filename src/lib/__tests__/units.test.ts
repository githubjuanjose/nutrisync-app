import { parseNum, cmToFtIn, ftInToCm, kgToLb, lbToKg, R, inR, isoToDate, dateToIso } from '../units';

describe('parseNum — entradas europeas y basura', () => {
  it('acepta enteros y decimales con punto', () => {
    expect(parseNum('88')).toBe(88);
    expect(parseNum('88.5')).toBe(88.5);
  });
  it('acepta coma decimal europea', () => {
    expect(parseNum('88,5')).toBe(88.5);
  });
  it('rechaza basura', () => {
    expect(parseNum('ddddddddd')).toBeNull();
    expect(parseNum('')).toBeNull();
    expect(parseNum('12abc')).toBeNull();
  });
});

describe('conversiones imperial ↔ métrico (round-trips del CHANGELOG v11.51)', () => {
  it("5'7\" ↔ 170 cm", () => {
    expect(ftInToCm(5, 7)).toBe(170);
    expect(cmToFtIn(170)).toEqual({ ft: 5, inch: 7 });
  });
  it('160 cm ↔ 5\'3"', () => {
    expect(cmToFtIn(160)).toEqual({ ft: 5, inch: 3 });
  });
  it('145 lb ↔ 65.8 kg', () => {
    expect(lbToKg(145)).toBe(65.8);
  });
  it('72.5 kg ↔ 159.8 lb y vuelta', () => {
    expect(kgToLb(72.5)).toBe(159.8);
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5, 1);
  });
  it('la BD siempre recibe métrico dentro de rango tras conversión típica', () => {
    const cm = ftInToCm(6, 0);
    const kg = lbToKg(180);
    expect(inR(cm, R.heightCm)).toBe(true);
    expect(inR(kg, R.weightKg)).toBe(true);
  });
});

describe('rangos canónicos (mismos que los CHECK de la BD)', () => {
  it.each([
    [90, true], [230, true], [89, false], [231, false],
  ])('altura %i → %s', (v, ok) => expect(inR(v, R.heightCm)).toBe(ok));
  it.each([
    [15, true], [90, true], [14, false], [91, false],
  ])('ciclo %i → %s', (v, ok) => expect(inR(v, R.cycleLen)).toBe(ok));
  it('banda blanda 21–45 es subconjunto del rango duro', () => {
    expect(R.cycleLenSoft[0]).toBeGreaterThan(R.cycleLen[0]);
    expect(R.cycleLenSoft[1]).toBeLessThan(R.cycleLen[1]);
  });
});

describe('fechas ISO ↔ Date', () => {
  it('round-trip estable', () => {
    const d = isoToDate('1995-06-15')!;
    expect(dateToIso(d)).toBe('1995-06-15');
  });
  it('rechaza formatos no ISO y basura', () => {
    expect(isoToDate('15/06/1995')).toBeNull();
    expect(isoToDate('ddddddddd')).toBeNull();
    expect(isoToDate('')).toBeNull();
  });
});
