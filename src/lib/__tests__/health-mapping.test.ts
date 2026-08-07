import {
  SIGNALS, ESSENTIAL_TYPES, signalSpec, toSignalRow, dedupe, dedupeKey,
  sleepMinutesToLabel, workoutToIntensity, flowToLevel,
  suggestDailyLog, haySugerencia,
} from '../health/mapping';

describe('contrato de señales', () => {
  it('cada señal explica para qué se pide (es el texto del permiso)', () => {
    SIGNALS.forEach(s => {
      expect(s.porque.length).toBeGreaterThan(20);
      expect(s.porque.endsWith('.')).toBe(true);
    });
  });

  it('lo esencial es poco: pedir de más es lo que hace que digan que no', () => {
    expect(ESSENTIAL_TYPES.length).toBeLessThanOrEqual(3);
    expect(ESSENTIAL_TYPES).toContain('sleep_minutes');
    expect(ESSENTIAL_TYPES).toContain('workout');
  });

  it('no hay señales duplicadas', () => {
    expect(new Set(SIGNALS.map(s => s.type)).size).toBe(SIGNALS.length);
  });
});

describe('muestra → fila de health_signal', () => {
  const ok = { type: 'steps' as const, value: 8123, startISO: '2026-08-05T00:00:00Z' };

  it('rellena la unidad desde el contrato, no desde quien llama', () => {
    expect(toSignalRow('apple_health', ok)!.unit).toBe('count');
    expect(signalSpec('sleep_minutes')!.unit).toBe('min');
  });

  it('descarta lo que no puede guardar, en vez de inventar', () => {
    expect(toSignalRow('apple_health', { ...ok, value: null })).toBeNull();
    expect(toSignalRow('apple_health', { ...ok, value: NaN })).toBeNull();
    expect(toSignalRow('apple_health', { ...ok, startISO: '' })).toBeNull();
    // tipo que la plataforma añade y nosotros no conocemos
    expect(toSignalRow('apple_health', { ...(ok as any), type: 'vo2max' })).toBeNull();
  });

  it('end_ts y metadata tienen valor por defecto, nunca undefined', () => {
    const r = toSignalRow('apple_health', ok)!;
    expect(r.end_ts).toBeNull();
    expect(r.metadata).toEqual({});
  });
});

describe('la misma muestra no entra dos veces', () => {
  it('la clave es espejo del índice único de la tabla', () => {
    const r = toSignalRow('apple_health', {
      type: 'steps', value: 10, startISO: '2026-08-05T06:00:00Z' })!;
    expect(dedupeKey(r)).toBe('apple_health|steps|2026-08-05T06:00:00Z');
  });

  it('dedupe conserva la primera y respeta el orden', () => {
    const mk = (v: number, ts: string) => toSignalRow('apple_health',
      { type: 'steps', value: v, startISO: ts })!;
    const out = dedupe([mk(1,'A'), mk(2,'B'), mk(3,'A')]);
    expect(out.map(r => r.value)).toEqual([1, 2]);
  });

  it('dos proveedores pueden traer la misma hora sin pisarse', () => {
    const a = toSignalRow('apple_health',   { type:'steps', value:1, startISO:'T' })!;
    const b = toSignalRow('health_connect', { type:'steps', value:1, startISO:'T' })!;
    expect(dedupe([a, b]).length).toBe(2);
  });
});

describe('sueño: minutos → etiqueta del registro diario', () => {
  it('cubre el rango completo sin huecos', () => {
    expect(sleepMinutesToLabel(180)).toBe('Very Poor');   // 3 h
    expect(sleepMinutesToLabel(300)).toBe('Restless');    // 5 h
    expect(sleepMinutesToLabel(390)).toBe('Okay');        // 6,5 h
    expect(sleepMinutesToLabel(480)).toBe('Restful');     // 8 h
    expect(sleepMinutesToLabel(540)).toBe('Deep');        // 9 h
  });

  it('las fronteras caen del lado declarado', () => {
    expect(sleepMinutesToLabel(239)).toBe('Very Poor');
    expect(sleepMinutesToLabel(240)).toBe('Restless');
    expect(sleepMinutesToLabel(509)).toBe('Restful');
    expect(sleepMinutesToLabel(510)).toBe('Deep');
  });

  it('sin dato no se inventa etiqueta', () => {
    expect(sleepMinutesToLabel(null)).toBeNull();
    expect(sleepMinutesToLabel(0)).toBeNull();
    expect(sleepMinutesToLabel(undefined)).toBeNull();
  });
});

describe('entrenamiento → intensidad del anillo', () => {
  it('reconoce por nombre en inglés y en español', () => {
    expect(workoutToIntensity('HIIT')).toBe('high');
    expect(workoutToIntensity('Running')).toBe('moderate');
    expect(workoutToIntensity('Natación')).toBe('moderate');
    expect(workoutToIntensity('Yoga')).toBe('low');
    expect(workoutToIntensity('Caminar')).toBe('low');
    expect(workoutToIntensity('Mindfulness')).toBe('rest');
  });

  it('sin nombre reconocible decide la duración — jamás null silencioso', () => {
    expect(workoutToIntensity('Actividad', 60)).toBe('moderate');
    expect(workoutToIntensity('Actividad', 15)).toBe('low');
    expect(workoutToIntensity(null, 0)).toBe('low');
    expect(workoutToIntensity(undefined)).toBe('low');
  });
});

describe('flujo menstrual: escala de la plataforma → la nuestra', () => {
  it('traduce las cuatro conocidas', () => {
    expect(flowToLevel('none')).toBe(0);
    expect(flowToLevel('light')).toBe(1);
    expect(flowToLevel('MEDIUM')).toBe(2);
    expect(flowToLevel('heavy')).toBe(3);
  });

  it('"unspecified" NO se convierte en un número inventado', () => {
    expect(flowToLevel('unspecified')).toBeNull();
    expect(flowToLevel(null)).toBeNull();
    expect(flowToLevel('')).toBeNull();
  });
});

describe('la regla de oro: sugerir sin pisar', () => {
  it('rellena solo lo que está vacío', () => {
    const s = suggestDailyLog(
      { sleepMinutes: 480, workoutMinutes: 30, flow: 'light' },
      { sleep_quality: null, workout_logged: null, flow_level: null });
    expect(s).toEqual({ sleep_quality: 'Restful', workout_logged: true, flow_level: 1 });
  });

  it('lo que ella escribió NO se toca, aunque el reloj diga otra cosa', () => {
    const s = suggestDailyLog(
      { sleepMinutes: 480, workoutMinutes: 30, flow: 'heavy' },
      { sleep_quality: 'Very Poor', workout_logged: false, flow_level: 0 });
    expect(s).toEqual({});                       // ni una sola propuesta
    expect(haySugerencia(s)).toBe(false);
  });

  it('mezcla: respeta el sueño escrito y propone lo demás', () => {
    const s = suggestDailyLog(
      { sleepMinutes: 300, workoutMinutes: 45, flow: null },
      { sleep_quality: 'Deep', workout_logged: null, flow_level: null });
    expect(s.sleep_quality).toBeUndefined();
    expect(s.workout_logged).toBe(true);
    expect(s.flow_level).toBeUndefined();
  });

  it('sin registro previo también propone (primer día de la usuaria)', () => {
    const s = suggestDailyLog({ sleepMinutes: 400 }, null);
    expect(s.sleep_quality).toBe('Okay');
  });

  it('cero minutos de ejercicio no es "ha entrenado"', () => {
    const s = suggestDailyLog({ workoutMinutes: 0 }, { workout_logged: null });
    expect(s.workout_logged).toBeUndefined();
    expect(haySugerencia(s)).toBe(false);
  });
});
