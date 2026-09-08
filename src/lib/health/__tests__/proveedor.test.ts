/**
 * UST-16 · O3 — unitarios de las reglas puras de Health Connect.
 * Lo que garantizan: que iPhone NO cambia (proveedorDePlataforma), que se
 * guarda solo lo CONCEDIDO, que el «ninguno» del flujo no se inventa, que el
 * sueño cuenta lo mismo que en iOS y que una temperatura relativa nunca entra
 * como si fuera absoluta.
 */
import {
  proveedorDePlataforma, nombreProveedor, estadoSdk, permisosHC, senalesConcedidas,
  flujoHCaTexto, nivelAFlujoHC, minutosDormidaHC, temperaturaAbsolutaHC,
  nombreEjercicioHC, RECORD_POR_SENAL, rangoHC, FUENTE_FUSIONADA_HC,
} from '../proveedor';
import { SIGNALS, SignalType, flowToLevel, workoutToIntensity } from '../mapping';

describe('proveedorDePlataforma · un desarrollo, dos superficies', () => {
  it('cada plataforma tiene el suyo y la web ninguno', () => {
    expect(proveedorDePlataforma('ios')).toBe('apple_health');
    expect(proveedorDePlataforma('android')).toBe('health_connect');
    expect(proveedorDePlataforma('web')).toBeNull();
  });
  it('los nombres son los comerciales', () => {
    expect(nombreProveedor('apple_health')).toBe('Apple Health');
    expect(nombreProveedor('health_connect')).toBe('Health Connect');
    expect(nombreProveedor(null)).toBe('—');
  });
});

describe('estadoSdk · ningún botón muerto (C2)', () => {
  it('traduce los tres estados de Health Connect', () => {
    expect(estadoSdk(3)).toBe('listo');
    expect(estadoSdk(2)).toBe('actualizar');
    expect(estadoSdk(1)).toBe('instalar');
  });
  it('lo que no reconoce no se hace pasar por listo', () => {
    expect(estadoSdk(null)).toBe('desconocido');
    expect(estadoSdk(99)).toBe('desconocido');
  });
});

describe('permisosHC', () => {
  it('las OCHO señales de la app tienen tipo de registro', () => {
    for (const s of SIGNALS) expect(RECORD_POR_SENAL[s.type]).toBeTruthy();
  });
  it('pide lectura de lo elegido, sin repetir, y escritura solo si ella la activa', () => {
    const p = permisosHC(['steps', 'sleep_minutes', 'steps'], false);
    expect(p).toEqual([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
    ]);
    const q = permisosHC(['menstrual_flow'], true);
    expect(q).toEqual([
      { accessType: 'read', recordType: 'MenstruationFlow' },
      { accessType: 'write', recordType: 'MenstruationFlow' },
    ]);
  });
});

describe('senalesConcedidas · se guarda lo concedido, no lo pedido (C3)', () => {
  it('traduce de vuelta solo las lecturas concedidas', () => {
    const r = senalesConcedidas([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'write', recordType: 'MenstruationFlow' },
    ]);
    expect(r.tipos.sort()).toEqual(['sleep_minutes', 'steps']);
    expect(r.escribir).toBe(true);
  });
  it('un permiso de escritura NO cuenta como lectura', () => {
    const r = senalesConcedidas([{ accessType: 'write', recordType: 'MenstruationFlow' }]);
    expect(r.tipos).toEqual([]);
    expect(r.escribir).toBe(true);
  });
  it('lista vacía o basura no revienta y no concede nada', () => {
    expect(senalesConcedidas(null)).toEqual({ tipos: [], escribir: false });
    expect(senalesConcedidas([{} as any, { accessType: 'read' } as any])).toEqual({ tipos: [], escribir: false });
  });
});

describe('flujo menstrual · la escala de Health Connect', () => {
  it('1/2/3 son leve/media/abundante y el 0 no se inventa', () => {
    expect(flowToLevel(flujoHCaTexto(1))).toBe(1);
    expect(flowToLevel(flujoHCaTexto(2))).toBe(2);
    expect(flowToLevel(flujoHCaTexto(3))).toBe(3);
    expect(flowToLevel(flujoHCaTexto(0))).toBeNull();      // UNKNOWN → null, como el «unspecified» de Apple
  });
  it('D2 · «ninguno» no tiene destino en Health Connect: no se escribe', () => {
    expect(nivelAFlujoHC(0)).toBeNull();
    expect(nivelAFlujoHC(1)).toBe(1);
    expect(nivelAFlujoHC(3)).toBe(3);
    expect(nivelAFlujoHC(9)).toBeNull();
    expect(nivelAFlujoHC(null)).toBeNull();
  });
});

describe('minutosDormidaHC', () => {
  const t = (h: number, m = 0) => new Date(Date.UTC(2026, 8, 8, h, m)).toISOString();
  it('sin stages cuenta la sesión entera', () => {
    expect(minutosDormidaHC(t(1), t(7))).toBe(360);
  });
  it('un fin ausente o anterior al inicio da 0, nunca un negativo', () => {
    expect(minutosDormidaHC(t(1), '')).toBe(0);
    expect(minutosDormidaHC(t(7), t(1))).toBe(0);
  });
  it('con stages cuenta solo dormida (2/4/5/6) y descarta despierta y fuera de cama', () => {
    const min = minutosDormidaHC(t(1), t(7), [
      { startTime: t(1), endTime: t(2), stage: 4 },     // ligero  60
      { startTime: t(2), endTime: t(3), stage: 5 },     // profundo 60
      { startTime: t(3), endTime: t(3, 30), stage: 1 }, // despierta (no cuenta)
      { startTime: t(3, 30), endTime: t(4), stage: 6 }, // REM 30
      { startTime: t(4), endTime: t(5), stage: 3 },     // fuera de cama (no cuenta)
    ]);
    expect(min).toBe(150);
  });
  it('una sesión entera despierta da 0 (no se sube)', () => {
    expect(minutosDormidaHC(t(1), t(3), [{ startTime: t(1), endTime: t(3), stage: 1 }])).toBe(0);
  });
});

describe('temperaturaAbsolutaHC · D3, nunca un delta disfrazado de absoluto', () => {
  it('sin baseline no hay dato', () => {
    expect(temperaturaAbsolutaHC(null, [0.3])).toBeNull();
    expect(temperaturaAbsolutaHC(0, [0.3])).toBeNull();
  });
  it('con baseline suma la media de los deltas', () => {
    expect(temperaturaAbsolutaHC(36.4, [0.2, 0.4])).toBeCloseTo(36.7, 2);
    expect(temperaturaAbsolutaHC(36.5, [])).toBeCloseTo(36.5, 2);
  });
});

describe('nombreEjercicioHC → intensidad que la app ya sabe puntuar', () => {
  it('el título de la usuaria manda sobre el catálogo', () => {
    expect(nombreEjercicioHC(83, 'Mi clase de HIIT')).toBe('Mi clase de HIIT');
    expect(workoutToIntensity(nombreEjercicioHC(83, 'Mi clase de HIIT'), 40)).toBe('high');
  });
  it('los tipos traducidos caen en la intensidad correcta', () => {
    expect(workoutToIntensity(nombreEjercicioHC(83, null), 30)).toBe('low');        // yoga
    expect(workoutToIntensity(nombreEjercicioHC(56, null), 30)).toBe('moderate');   // running
    expect(workoutToIntensity(nombreEjercicioHC(36, null), 20)).toBe('high');       // HIIT
    expect(workoutToIntensity(nombreEjercicioHC(79, null), 20)).toBe('low');        // walking
  });
  it('un tipo desconocido no inventa nombre: decide la duración (r12-b4)', () => {
    expect(nombreEjercicioHC(999, null)).toBeNull();
    expect(workoutToIntensity(nombreEjercicioHC(999, null), 50)).toBe('moderate');
  });
});

describe('rangoHC y la fuente fusionada', () => {
  it('el rango es el operador between con ISO', () => {
    expect(rangoHC('2026-09-08T00:00:00.000Z', '2026-09-08T10:00:00.000Z'))
      .toEqual({ operator: 'between', startTime: '2026-09-08T00:00:00.000Z', endTime: '2026-09-08T10:00:00.000Z' });
  });
  it('la fuente fusionada de Android es su propia etiqueta (no pisa la de iOS)', () => {
    expect(FUENTE_FUSIONADA_HC).toBe('hc_merged');
  });
});

describe('paridad de contrato con iOS', () => {
  it('toda señal esencial de la app existe en Health Connect', () => {
    const esenciales = SIGNALS.filter((s) => s.esencial).map((s) => s.type) as SignalType[];
    for (const t of esenciales) expect(RECORD_POR_SENAL[t]).toBeTruthy();
  });
});
