/** M-1 · cycleStats — reglas D9/D10/D11 + outliers R10 (el ciclo de 47 días). */
import { closedCycles, personalAvg, baselineLen, normalRange, predictNext, dayState, addDaysISO } from '../cycleStats';

const starts = (lens: number[], from = '2026-01-01') => {
  const out = [from];
  for (const l of lens) out.push(addDaysISO(out[out.length - 1], l));
  return out;
};

describe('closedCycles — derivar cerrados de los inicios', () => {
  it('n inicios → n-1 cerrados con longitudes correctas', () => {
    const cc = closedCycles(starts([28, 30, 29]));
    expect(cc.map((c) => c.length)).toEqual([28, 30, 29]);
    expect(cc[0].end).toBe(addDaysISO(cc[1].start, -1));
  });
  it('descarta huecos no-ciclo (>90 días) y duplicados/desorden', () => {
    const s = starts([28, 120, 29]);                    // 120 = hueco de registro
    const cc = closedCycles([s[2], s[0], s[1], s[3], s[0]]);
    expect(cc.map((c) => c.length)).toEqual([28, 29]);
  });
  it('caso Lucía: 26-jun → 31-jul = ciclo cerrado de 35 días', () => {
    const cc = closedCycles(['2026-06-26', '2026-07-31']);
    expect(cc[0].length).toBe(35);
  });
});

describe('outliers R10 — 47 días fuera, patrón repetido dentro', () => {
  it('un 47 aislado entre 28s es outlier y NO mueve la media', () => {
    const cc = closedCycles(starts([28, 29, 28, 47, 28]));
    expect(cc.find((c) => c.length === 47)!.outlier).toBe(true);
    expect(personalAvg(cc)).toBe(28);
  });
  it('dos largos consecutivos = patrón nuevo → entran en la media', () => {
    const cc = closedCycles(starts([28, 28, 40, 41]));
    expect(cc.filter((c) => c.outlier)).toHaveLength(0);
  });
  it('con <3 cerrados nadie es outlier (sin patrón aún)', () => {
    const cc = closedCycles(starts([28, 47]));
    expect(cc.every((c) => !c.outlier)).toBe(true);
  });
});

describe('baselineLen — D10: rebaseline automático al 3er cerrado', () => {
  it('con 2 cerrados manda onboarding', () => {
    const cc = closedCycles(starts([31, 32]));
    expect(baselineLen(cc, 28)).toEqual({ len: 28, personal: false });
  });
  it('con 3 cerrados manda la media personal', () => {
    const cc = closedCycles(starts([31, 32, 33]));
    expect(baselineLen(cc, 28)).toEqual({ len: 32, personal: true });
  });
});

describe('banda y predicción', () => {
  it('banda normal ± max(2, sd) y predicción = último inicio + media', () => {
    const s = starts([28, 30, 29, 28]);
    const cc = closedCycles(s);
    const band = normalRange(cc)!;
    expect(band.lo).toBeLessThanOrEqual(27);
    expect(band.hi).toBeGreaterThanOrEqual(30);
    const p = predictNext(s[s.length - 1], cc, 28);
    expect(p.dateISO).toBe(addDaysISO(s[s.length - 1], personalAvg(cc)!));
  });
});

describe('dayState — tramos D9 (+3) / drift (+8) / care (+14)', () => {
  it.each([
    [28, 'normal'], [29, 'grace'], [31, 'grace'],
    [32, 'awaiting'], [36, 'awaiting'],
    [37, 'drift'], [42, 'drift'],
    [43, 'care'],
  ] as [number, string][])('día %i con media 28 → %s', (d, want) => {
    expect(dayState(d, 28)).toBe(want);
  });
});

/* ── r11c-2 · planNewCycle: la decisión completa de startNewCycle, pura ── */
import { planNewCycle, clampPeriodDur } from '../cycleStats';

describe('planNewCycle — duplicado / corrección / nuevo', () => {
  it('primer ciclo de la vida → new con avg de onboarding y sin cierre', () => {
    const p = planNewCycle([], '2026-08-01', 28);
    expect(p).toEqual({ kind: 'new', avg: 28, closed: undefined, rebaselined: false, outlier: false });
  });
  it('mismo inicio → duplicate (no-op)', () => {
    expect(planNewCycle(['2026-08-01'], '2026-08-01', 28).kind).toBe('duplicate');
  });
  it('fecha anterior al vigente → correction (jamás insertar desordenado)', () => {
    expect(planNewCycle(['2026-08-01'], '2026-07-28', 28).kind).toBe('correction');
  });
  it('caso Lucía: cierre de 35 días bien informado', () => {
    const p = planNewCycle(['2026-06-26'], '2026-07-31', 28);
    expect(p.kind).toBe('new');
    if (p.kind === 'new') expect(p.closed).toBe(35);
  });
});

describe('planNewCycle — D10: onboarding manda hasta el 3er cerrado', () => {
  const s = (lens: number[], from = '2026-01-01') => {
    const out = [from];
    for (const l of lens) out.push(addDaysISO(out[out.length - 1], l));
    return out;
  };
  it('con 2 cerrados el avg sigue siendo onboarding y sin FYI', () => {
    const starts = s([31, 32]);                       // 3 inicios = 2 cerrados
    const p = planNewCycle(starts.slice(0, -1), starts[starts.length - 1], 28);
    if (p.kind === 'new') { expect(p.avg).toBe(28); expect(p.rebaselined).toBe(false); }
  });
  it('el 3er cerrado activa la media personal + FYI una sola vez', () => {
    const starts = s([31, 32, 33]);                   // este alta cierra el 3º
    const p = planNewCycle(starts.slice(0, -1), starts[starts.length - 1], 28);
    if (p.kind === 'new') { expect(p.avg).toBe(32); expect(p.rebaselined).toBe(true); }
  });
  it('el 4º cerrado ya no repite el FYI', () => {
    const starts = s([31, 32, 33, 31]);
    const p = planNewCycle(starts.slice(0, -1), starts[starts.length - 1], 28);
    if (p.kind === 'new') expect(p.rebaselined).toBe(false);
  });
  it('cierre outlier (47) se marca y NO mueve la media', () => {
    const starts = s([28, 29, 28, 47]);
    const p = planNewCycle(starts.slice(0, -1), starts[starts.length - 1], 28);
    if (p.kind === 'new') { expect(p.outlier).toBe(true); expect(p.avg).toBe(28); }
  });
});

describe('clampPeriodDur — End period', () => {
  it.each([[1, 1], [2, 1], [5, 4], [16, 14], [40, 14]])('día %i → %i', (d, want) => {
    expect(clampPeriodDur(d)).toBe(want);
  });
});

describe('inPredictedPeriod (NS-0009: la predicción pintada en la rejilla)', () => {
  const { inPredictedPeriod } = require('../cycleStats');
  it('dentro de la ventana prevista (primer y último día)', () => {
    expect(inPredictedPeriod('2026-08-10', '2026-08-10', 5)).toBe(true);
    expect(inPredictedPeriod('2026-08-14', '2026-08-10', 5)).toBe(true);
  });
  it('fuera: la víspera y el día siguiente al fin', () => {
    expect(inPredictedPeriod('2026-08-09', '2026-08-10', 5)).toBe(false);
    expect(inPredictedPeriod('2026-08-15', '2026-08-10', 5)).toBe(false);
  });
  it('sin predicción → false · duración 0/ausente → respaldo del producto (5), regla r12-b4', () => {
    expect(inPredictedPeriod('2026-08-10', null, 5)).toBe(false);
    expect(inPredictedPeriod('2026-08-10', '2026-08-10', 0)).toBe(true);   // día 1 del respaldo
    expect(inPredictedPeriod('2026-08-14', '2026-08-10', 0)).toBe(true);   // día 5 del respaldo
    expect(inPredictedPeriod('2026-08-15', '2026-08-10', 0)).toBe(false);  // fuera
    expect(inPredictedPeriod('2026-08-16', '2026-08-10', 99)).toBe(true);  // tope 14 acota
    expect(inPredictedPeriod('2026-08-24', '2026-08-10', 99)).toBe(false);
  });
  it('cruza el fin de mes sin sustos (addDaysISO es la única aritmética)', () => {
    expect(inPredictedPeriod('2026-09-01', '2026-08-29', 5)).toBe(true);
    expect(inPredictedPeriod('2026-09-03', '2026-08-29', 5)).toBe(false);
  });
});
