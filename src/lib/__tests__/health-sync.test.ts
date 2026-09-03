/**
 * Wearables O1 (UST-2026-08-24-06) — unitarios de la parte PURA del sync.
 * Regla r11c-2: la lógica nace con sus casos en el mismo cambio.
 */
import { ventanaDeSync, minutosDeSuenoPorDia, resumenDeHoy } from '../health/sync';
import { localDayISO } from '../localDay';
import { flujoHKaTexto, nivelAFlujoHK, SUENO_DORMIDA } from '../health/healthkit';
import type { HealthSignalRow } from '../health/mapping';

const DIA = 86400000;

describe('ventanaDeSync — desde dónde leer', () => {
  const ahora = '2026-08-25T10:00:00.000Z';

  it('primera vez: 14 días atrás', () => {
    const v = ventanaDeSync(null, ahora);
    expect(v.hastaISO).toBe(ahora);
    expect(new Date(ahora).getTime() - new Date(v.desdeISO).getTime()).toBe(14 * DIA);
  });

  it('con última señal reciente: desde ella menos 1 día de solape', () => {
    const ultimo = '2026-08-24T08:00:00.000Z';
    const v = ventanaDeSync(ultimo, ahora);
    expect(v.desdeISO).toBe(new Date(new Date(ultimo).getTime() - DIA).toISOString());
  });

  it('con última señal ANTIGUA: el suelo de 14 días manda', () => {
    const v = ventanaDeSync('2026-07-01T00:00:00.000Z', ahora);
    expect(new Date(ahora).getTime() - new Date(v.desdeISO).getTime()).toBe(14 * DIA);
  });
});

describe('minutosDeSuenoPorDia — la noche pertenece al día en que DESPIERTA', () => {
  it('23:00→07:00 suma al día del final del tramo (local, no Greenwich)', () => {
    const fin = new Date('2026-08-25T07:00:00');
    const porDia = minutosDeSuenoPorDia([
      { startISO: '2026-08-24T23:00:00', endISO: fin.toISOString(), minutos: 480 },
    ]);
    expect(porDia[localDayISO(fin)]).toBe(480);
  });

  it('dos tramos de la misma noche se suman; los minutos 0 se ignoran', () => {
    const fin = new Date('2026-08-25T07:00:00');
    const porDia = minutosDeSuenoPorDia([
      { startISO: '2026-08-24T23:00:00', endISO: '2026-08-25T02:00:00', minutos: 180 },
      { startISO: '2026-08-25T02:30:00', endISO: fin.toISOString(), minutos: 270 },
      { startISO: '2026-08-25T03:00:00', endISO: fin.toISOString(), minutos: 0 },
    ]);
    expect(porDia[localDayISO(fin)]).toBe(450);
  });
});

describe('resumenDeHoy — solo cuenta lo de HOY local', () => {
  const hoy = localDayISO(new Date('2026-08-25T12:00:00'));
  const fila = (type: HealthSignalRow['type'], value: number, ts: string, metadata: any = {}): HealthSignalRow =>
    ({ provider: 'apple_health', type, value, unit: 'min', start_ts: ts, end_ts: ts, metadata });

  it('suma sueño, entreno y pasos del día y trae el flujo como texto', () => {
    const r = resumenDeHoy([
      fila('sleep_minutes', 420, '2026-08-25T07:00:00'),
      fila('workout', 45, '2026-08-25T09:00:00'),
      fila('steps', 12000, '2026-08-25T10:00:00'),
      fila('steps', 5000, '2026-08-25T18:00:00'),          // r24-i: dos tramos suman
      fila('menstrual_flow', 3, '2026-08-25T08:00:00', { flow_text: 'medium' }),
      fila('sleep_minutes', 400, '2026-08-24T07:00:00'),   // ayer: fuera
      fila('steps', 9999, '2026-08-24T10:00:00'),          // ayer: fuera
    ], hoy);
    expect(r).toEqual({ sleepMinutes: 420, workoutMinutes: 45, flow: 'medium', steps: 17000 });
  });

  it('sin señales de hoy: todo null (nada de ceros que parezcan datos)', () => {
    const r = resumenDeHoy([fila('workout', 30, '2026-08-20T09:00:00')], hoy);
    expect(r).toEqual({ sleepMinutes: null, workoutMinutes: null, flow: null, steps: null });
  });
});

describe('healthkit — tablas de traducción puras', () => {
  it('flujo HK→texto: 2/3/4/5 y el 1 (unspecified) que NO inventa nivel', () => {
    expect(flujoHKaTexto(2)).toBe('light');
    expect(flujoHKaTexto(3)).toBe('medium');
    expect(flujoHKaTexto(4)).toBe('heavy');
    expect(flujoHKaTexto(5)).toBe('none');
    expect(flujoHKaTexto(1)).toBe('unspecified');
  });

  it('nuestro nivel→HK (escritura O2) y el fuera de rango a null', () => {
    expect(nivelAFlujoHK(0)).toBe(5);
    expect(nivelAFlujoHK(1)).toBe(2);
    expect(nivelAFlujoHK(2)).toBe(3);
    expect(nivelAFlujoHK(3)).toBe(4);
    expect(nivelAFlujoHK(7)).toBeNull();
  });

  it('los valores de sueño DORMIDA son 1/3/4/5 (0 = en la cama, no cuenta)', () => {
    expect(SUENO_DORMIDA.has(1)).toBe(true);
    expect(SUENO_DORMIDA.has(0)).toBe(false);
    expect(SUENO_DORMIDA.has(4)).toBe(true);
  });
});
