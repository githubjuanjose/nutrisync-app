/** r11c-2 · CSS (Cycle Stability Score) — fórmula master-doc 45/45/10 con
 *  puertas honestas (jamás 100 por defecto) y modo rango-cerrado (Last/Best). */
import { cycleStabilityV2, baselineCAS, seriesStability } from '../progress';

type Row = { date: string; mood: number | null; energy: number | null };
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** filas consecutivas desde `from`, con [mood, energy] por día */
const rows = (from: string, vals: [number, number][]): Row[] => {
  const t0 = new Date(from + 'T00:00:00').getTime();
  return vals.map(([m, e], i) => ({ date: iso(t0 + i * DAY), mood: m, energy: e }));
};
const flat = (n: number): [number, number][] => Array.from({ length: n }, () => [3, 3]);
const wild = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => (i % 2 ? [5, 5] : [1, 1]));

const BASE = { from: '2026-01-01', to: '2026-01-28' };
const CUR = '2026-02-01';

describe('cycleStabilityV2 — puertas honestas', () => {
  it('sin baseline o sin inicio actual → null (candado "keep syncing")', () => {
    expect(cycleStabilityV2([], new Set(), null, CUR)).toBeNull();
    expect(cycleStabilityV2([], new Set(), BASE, null)).toBeNull();
  });
  it('baseline con <7 días registrados → null', () => {
    const me = [...rows('2026-01-01', flat(5)), ...rows(CUR, flat(9))];
    expect(cycleStabilityV2(me, new Set(), BASE, CUR)).toBeNull();
  });
  it('ventana actual con <5 días → null', () => {
    const me = [...rows('2026-01-01', flat(10)), ...rows(CUR, flat(4))];
    expect(cycleStabilityV2(me, new Set(), BASE, CUR)).toBeNull();
  });
});

describe('cycleStabilityV2 — pesos 45/45/10', () => {
  it('estabilidad igual y sin PMS → 50 (punto neutro)', () => {
    const me = [...rows('2026-01-01', flat(10)), ...rows(CUR, flat(8))];
    expect(cycleStabilityV2(me, new Set(), BASE, CUR)).toBe(50);
  });
  it('volatilidad eliminada en energía+ánimo (sin PMS) → 95 (50 + 45 + 45)', () => {
    const me = [...rows('2026-01-01', wild(10)), ...rows(CUR, flat(8))];
    expect(cycleStabilityV2(me, new Set(), BASE, CUR)).toBe(95);
  });
  it('solo mejora PMS (vol igual) → 55: el término PMS pesa el 10%', () => {
    const base = rows('2026-01-01', flat(10));
    const cur = rows(CUR, flat(8));
    const symp = new Set(base.map((r) => r.date));       // base: PMS todos los días
    expect(cycleStabilityV2([...base, ...cur], symp, BASE, CUR)).toBe(55);
  });
  it('empeoramiento total → muy bajo, nunca negativo', () => {
    const me = [...rows('2026-01-01', flat(10)), ...rows(CUR, wild(8))];
    const v = cycleStabilityV2(me, new Set(), BASE, CUR)!;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(10);
  });
});

describe('cycleStabilityV2 — modo rango cerrado (Last/Best del trío)', () => {
  it('currentToISO acota la ventana: datos posteriores NO contaminan', () => {
    const base = rows('2026-01-01', wild(10));
    const closed = rows(CUR, flat(6));                   // ciclo cerrado, estable
    const after = rows('2026-03-01', wild(10));          // ruido posterior
    const to = closed[closed.length - 1].date;
    const a = cycleStabilityV2([...base, ...closed], new Set(), BASE, CUR, to);
    const b = cycleStabilityV2([...base, ...closed, ...after], new Set(), BASE, CUR, to);
    expect(a).toBe(b);
    expect(a).toBe(95);
  });
});

describe('baselineCAS y seriesStability — puertas', () => {
  it('baselineCAS: media de la primera semana; null con <7', () => {
    const hist = Array.from({ length: 9 }, (_, i) => ({
      date: iso(new Date('2026-01-01T00:00:00').getTime() + i * DAY),
      cas_total: 40 + i,
    })) as any[];
    expect(baselineCAS(hist)).toBe(43);                  // media 40..46
    expect(baselineCAS(hist.slice(0, 5))).toBeNull();
  });
  it('seriesStability: plano → 100, salvaje → 0, corto → null', () => {
    expect(seriesStability([3, 3, 3, 3, 3, 3, 3])).toBe(100);
    expect(seriesStability([1, 5, 1, 5, 1, 5, 1])).toBe(0);
    expect(seriesStability([3, 3, 3])).toBeNull();
  });
});

/* ── r12-b2 · escalera de baseline del CSS (bug Pilar: nunca se desbloqueaba) ── */
import { cssWindows } from '../progress';

/* fechas en UTC ('…Z'): construirlas en local y serializarlas en UTC desplazaba
   un día según la zona horaria de la máquina que corre los tests */
const logged = (n: number, from = '2026-07-01') =>
  Array.from({ length: n }, (_, i) => ({
    date: iso(new Date(from + 'T00:00:00Z').getTime() + i * DAY), mood: 3, energy: 3,
  }));

describe('cssWindows — desbloqueo honesto sin ciclo cerrado', () => {
  it('con ciclo cerrado usa ESE como referencia (camino preferente)', () => {
    const closed = [[{ date: '2026-06-01' }, { date: '2026-06-28' }]] as any;
    const w = cssWindows(logged(30), closed, '2026-07-01');
    expect(w.ready).toBe(true);
    if (w.ready) {
      expect(w.vsFirstWeek).toBe(false);
      expect(w.base).toEqual({ from: '2026-06-01', to: '2026-06-28' });
      expect(w.currentFrom).toBe('2026-07-01');
    }
  });
  it('caso Pilar: 11 días y sin ciclo cerrado → bloqueado con cuenta atrás clara', () => {
    const w = cssWindows(logged(11), [], '2026-07-01');
    expect(w).toEqual({ ready: false, have: 11, need: 12 });
  });
  it('al 12º día se desbloquea con "vs tu primera semana" y ventanas SIN solape', () => {
    const w = cssWindows(logged(12), [], '2026-07-01');
    expect(w.ready).toBe(true);
    if (w.ready) {
      expect(w.vsFirstWeek).toBe(true);
      expect(w.base.from).toBe('2026-07-01');
      expect(w.base.to).toBe('2026-07-07');          // 7 primeros
      expect(w.currentFrom).toBe('2026-07-08');      // el resto, sin solapar
    }
  });
  it('los días a medias (sin ánimo o sin energía) no cuentan para desbloquear', () => {
    const half = logged(12).map((r, i) => (i % 2 ? { ...r, energy: null } : r));
    const w = cssWindows(half, [], '2026-07-01');
    expect(w.ready).toBe(false);
    if (!w.ready) expect(w.have).toBe(6);
  });
});
