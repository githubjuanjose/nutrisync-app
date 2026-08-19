/**
 * La escalera temporal del Today (UST-02 v2 · L3/L5) — r11c-2: la lógica
 * nace con sus casos. Hoy fijo = 2026-08-19 · alta = 2026-07-01.
 */
import { periodoHoy, atras, adelante, rango, esEditable, etiqueta, sumaDias, Periodo } from '../tiempo';

const HOY = '2026-08-19';
const ALTA = '2026-07-01';

describe('la escalera hacia atrás', () => {
  it('7 días día a día, y el octavo paso salta a MES', () => {
    let p: Periodo | null = periodoHoy(HOY);
    const vistos: string[] = [];
    for (let i = 0; i < 6; i++) {
      p = atras(p!, HOY, ALTA);
      expect(p!.tipo).toBe('dia');
      vistos.push((p as any).fecha);
    }
    expect(vistos[5]).toBe('2026-08-13');            // hoy-6
    p = atras(p!, HOY, ALTA);                        // séptimo paso
    expect(p).toEqual({ tipo: 'mes', anio: 2026, mes: 8 });
  });

  it('mes a mes hasta el suelo del alta y luego null', () => {
    let p: Periodo | null = { tipo: 'mes', anio: 2026, mes: 8 };
    p = atras(p, HOY, ALTA);
    expect(p).toEqual({ tipo: 'mes', anio: 2026, mes: 7 });   // julio contiene el alta
    p = atras(p!, HOY, ALTA);
    expect(p).toBeNull();                            // junio termina antes del alta
  });

  it('con historia larga, tras 12 meses vienen trimestres y tras 8 el año', () => {
    const altaVieja = '2020-01-01';
    let p: Periodo | null = { tipo: 'mes', anio: 2025, mes: 9 };  // hace 11 meses
    p = atras(p, HOY, altaVieja);
    expect(p!.tipo).toBe('tri');                     // el 12º mes cambia de zoom
    let saltos = 0;
    while (p!.tipo === 'tri' && saltos < 12) { p = atras(p!, HOY, altaVieja); saltos++; }
    expect(p!.tipo).toBe('anio');
  });
});

describe('la escalera hacia delante', () => {
  it('el futuro no existe: en hoy, adelante = null', () => {
    expect(adelante(periodoHoy(HOY), HOY)).toBeNull();
  });
  it('desde ayer se vuelve a hoy', () => {
    expect(adelante({ tipo: 'dia', fecha: sumaDias(HOY, -1) }, HOY))
      .toEqual({ tipo: 'dia', fecha: HOY });
  });
  it('desde el mes frontera se re-entra en la zona diaria', () => {
    const p = adelante({ tipo: 'mes', anio: 2026, mes: 8 }, HOY);
    expect(p).toEqual({ tipo: 'dia', fecha: '2026-08-13' });   // hoy-6
  });
});

describe('rangos [desde, hasta)', () => {
  it('día', () => {
    expect(rango({ tipo: 'dia', fecha: '2026-08-12' }))
      .toEqual({ desde: '2026-08-12', hasta: '2026-08-13' });
  });
  it('mes con cambio de año', () => {
    expect(rango({ tipo: 'mes', anio: 2025, mes: 12 }))
      .toEqual({ desde: '2025-12-01', hasta: '2026-01-01' });
  });
  it('trimestre', () => {
    expect(rango({ tipo: 'tri', anio: 2026, tri: 2 }))
      .toEqual({ desde: '2026-04-01', hasta: '2026-07-01' });
  });
  it('año', () => {
    expect(rango({ tipo: 'anio', anio: 2026 }))
      .toEqual({ desde: '2026-01-01', hasta: '2027-01-01' });
  });
});

describe('L5: editable solo hoy y ayer', () => {
  it('hoy sí, ayer sí, anteayer no, mes no', () => {
    expect(esEditable(periodoHoy(HOY), HOY)).toBe(true);
    expect(esEditable({ tipo: 'dia', fecha: sumaDias(HOY, -1) }, HOY)).toBe(true);
    expect(esEditable({ tipo: 'dia', fecha: sumaDias(HOY, -2) }, HOY)).toBe(false);
    expect(esEditable({ tipo: 'mes', anio: 2026, mes: 7 }, HOY)).toBe(false);
  });
});

describe('etiquetas del pill', () => {
  it('hoy · ayer · día con fecha · mes · año', () => {
    expect(etiqueta(periodoHoy(HOY), HOY)).toEqual({ clase: 'hoy' });
    expect(etiqueta({ tipo: 'dia', fecha: sumaDias(HOY, -1) }, HOY)).toEqual({ clase: 'ayer' });
    expect(etiqueta({ tipo: 'dia', fecha: '2026-08-14' }, HOY)).toEqual({ clase: 'dia', fecha: '2026-08-14' });
    expect(etiqueta({ tipo: 'mes', anio: 2026, mes: 7 }, HOY)).toEqual({ clase: 'mes', anio: 2026, mes: 7 });
    expect(etiqueta({ tipo: 'anio', anio: 2025 }, HOY)).toEqual({ clase: 'anio', anio: 2025 });
  });
});
