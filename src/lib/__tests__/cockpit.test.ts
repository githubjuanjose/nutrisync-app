/**
 * Cockpit de actividad (r24-o) — unitarios de la parte PURA (r11c-2).
 */
import { agregaPasos, inicioTrimestreISO, inicioCicloISO, familiaFase, diasDeFase, zonaHoraria } from '../health/cockpit';

describe('familiaFase — granular (daily_scores) → familia (badge/recs)', () => {
  it('mapea los sub-tramos lúteos a luteal', () => {
    expect(familiaFase('late_luteal')).toBe('luteal');
    expect(familiaFase('early_luteal')).toBe('luteal');
    expect(familiaFase('luteal')).toBe('luteal');
  });
  it('resto de familias', () => {
    expect(familiaFase('ovulatory')).toBe('ovulatory');
    expect(familiaFase('follicular')).toBe('follicular');
    expect(familiaFase('menstrual')).toBe('menstrual');
  });
  it('vacío o desconocido', () => {
    expect(familiaFase(null)).toBeNull();
    expect(familiaFase('')).toBeNull();
    expect(familiaFase('raro')).toBe('raro');
  });
});

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

describe('diasDeFase — la fase de un día se CALCULA del ciclo, no se lee de los check-ins (7-sep)', () => {
  // Ciclo de 28: menstrual 1-5 · folicular 6-13 · ovulatoria 14-16 · lútea 17-28 (phaseForDay)
  it('día 20 de un ciclo de 28 en fase lútea → los días 17..20, cuatro días', () => {
    const d = diasDeFase('2026-09-07', 20, 28, 'luteal')!;
    expect(d.size).toBe(4);
    expect(d.has('2026-09-07')).toBe(true);   // día 20 = hoy
    expect(d.has('2026-09-04')).toBe(true);   // día 17 = inicio de la lútea
    expect(d.has('2026-09-03')).toBe(false);  // día 16 = ovulatoria, fuera
  });
  it('la familia manda: late_luteal y early_luteal cuentan como luteal', () => {
    const d = diasDeFase('2026-09-07', 20, 28, 'late_luteal')!;
    expect(d.size).toBe(4);
  });
  it('un ciclo largo (día 44, largo 28): toda la lútea desde el día 17, sin depender de daily_scores', () => {
    const d = diasDeFase('2026-09-07', 44, 28, 'luteal')!;
    expect(d.size).toBe(28);                    // días 17..44
    expect(d.has('2026-09-07')).toBe(true);
    expect(d.has('2026-08-11')).toBe(true);     // día 17
    expect(d.has('2026-08-10')).toBe(false);    // día 16
  });
  it('día 3, menstrual → tres días', () => {
    expect(diasDeFase('2026-09-07', 3, 28, 'menstrual')!.size).toBe(3);
  });
  it('sin día de ciclo o sin fase → null (el bucket se queda en 0, no revienta)', () => {
    expect(diasDeFase('2026-09-07', null, 28, 'luteal')).toBeNull();
    expect(diasDeFase('2026-09-07', 0, 28, 'luteal')).toBeNull();
    expect(diasDeFase('2026-09-07', 12, 28, null)).toBeNull();
  });
  it('un largo de ciclo absurdo cae al estándar de 28', () => {
    expect(diasDeFase('2026-09-07', 20, 3, 'luteal')!.size).toBe(4);
  });
});

describe('zonaHoraria — la app le dice a la base qué día es para ella (NS-0010)', () => {
  it('devuelve una zona IANA o null, nunca revienta', () => {
    const z = zonaHoraria();
    expect(z === null || typeof z === 'string').toBe(true);
  });
});
