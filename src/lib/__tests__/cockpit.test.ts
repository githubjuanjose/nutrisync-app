/**
 * Cockpit de actividad (r24-o) — unitarios de la parte PURA (r11c-2).
 */
import { agregaPasos, inicioTrimestreISO, inicioCicloISO } from '../health/cockpit';

describe('inicioTrimestreISO', () => {
  it('mapea el mes a su trimestre natural', () => {
    expect(inicioTrimestreISO('2026-01-15')).toBe('2026-01-01');
    expect(inicioTrimestreISO('2026-03-31')).toBe('2026-01-01');
    expect(inicioTrimestreISO('2026-04-01')).toBe('2026-04-01');
    expect(inicioTrimestreISO('2026-09-03')).toBe('2026-07-01');
    expect(inicioTrimestreISO('2026-12-31')).toBe('2026-10-01');
  });
});

describe('inicioCicloISO — día 1 = inicio del ciclo', () => {
  it('resta cycle_day-1 días al hoy local', () => {
    expect(inicioCicloISO('2026-09-03', 1)).toBe('2026-09-03');
    expect(inicioCicloISO('2026-09-03', 3)).toBe('2026-09-01');
  });
  it('sin cycle_day válido → null', () => {
    expect(inicioCicloISO('2026-09-03', null)).toBeNull();
    expect(inicioCicloISO('2026-09-03', 0)).toBeNull();
  });
});

describe('agregaPasos — cada bucket suma su ventana', () => {
  const hoy = '2026-09-03';
  const filas = [
    { dayISO: '2026-09-03', value: 5000 },   // hoy
    { dayISO: '2026-09-02', value: 3000 },   // ayer (ciclo/fase/mes/tri/ytd/total)
    { dayISO: '2026-09-01', value: 2000 },   // inicio de ciclo (cycle_day=3 → desde 09-01)
    { dayISO: '2026-08-15', value: 4000 },   // mes anterior (tri/ytd/total)
    { dayISO: '2026-06-30', value: 1000 },   // Q2 (ytd/total, fuera de trimestre Q3)
    { dayISO: '2025-12-20', value: 9000 },   // año pasado (solo total)
    { dayISO: '2026-09-04', value: 7777 },   // futuro: se ignora en ventanas hasta hoy
  ];
  const cicloDesde = inicioCicloISO(hoy, 3);            // 2026-09-01
  const diasFase = new Set(['2026-09-02', '2026-09-03']); // fase actual = 2 días

  const r = agregaPasos(filas, hoy, cicloDesde, diasFase);

  it('hoy = solo el día de hoy', () => expect(r.hoy).toBe(5000));
  it('ciclo = desde el inicio del ciclo hasta hoy', () => expect(r.ciclo).toBe(10000)); // 09-01..09-03
  it('fase = solo los días de la fase actual', () => expect(r.fase).toBe(8000));        // 09-02+09-03
  it('mes = mes en curso hasta hoy', () => expect(r.mes).toBe(10000));                  // 09-01..09-03
  it('trimestre = Q3 hasta hoy (excluye 06-30)', () => expect(r.trimestre).toBe(14000)); // +08-15
  it('ytd = año en curso hasta hoy', () => expect(r.ytd).toBe(15000));                  // +06-30
  it('total = todo, incluido año pasado; el futuro también cuenta al total', () =>
    expect(r.total).toBe(31777));                                                       // +2025 +futuro
  it('el día futuro no entra en ninguna ventana hasta-hoy', () => {
    expect(r.ytd).toBe(15000); // 7777 de 09-04 no está aquí
  });
});

describe('agregaPasos — sin ciclo ni fase', () => {
  it('ciclo y fase quedan en 0, el resto suma', () => {
    const r = agregaPasos([{ dayISO: '2026-09-03', value: 1200 }], '2026-09-03', null, null);
    expect(r).toEqual({ hoy: 1200, ciclo: 0, fase: 0, mes: 1200, trimestre: 1200, ytd: 1200, total: 1200 });
  });
});
